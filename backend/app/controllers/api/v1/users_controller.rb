module Api
  module V1
    class UsersController < BaseController
      before_action :authenticate_rodauth_user!
      before_action :set_user, only: [:show, :update, :destroy, :toggle_confirmation, :update_password]
      before_action -> { authorize_permission!(Permission::VIEW_USERS) }, only: [:index]
      before_action -> { authorize_permission!(Permission::CREATE_USERS) }, only: [:create]
      before_action -> { authorize_permission!(Permission::EDIT_USERS) }, only: [:update, :toggle_confirmation, :update_password]
      before_action -> { authorize_permission!(Permission::DELETE_USERS) }, only: [:destroy]
      before_action -> { authorize_permission!(Permission::EXPORT_USERS) }, only: [:export]
      before_action :authorize_show, only: [:show]
      before_action :check_admin_user_modification, only: [:update, :destroy, :toggle_confirmation]
      before_action :check_self_role_elevation, only: [:update]

      # GET /api/v1/users
      def index
        # Create a more comprehensive cache key that includes all search parameters
        cache_key_params = [
          params[:page] || 1,
          params[:per_page] || 12,
          params[:search],
          params[:role]
        ].compact.join(':')

        cache_key = "users:index:#{cache_key_params}"
        
        users_with_pagination = Rails.cache.fetch(cache_key, expires_in: 5.minutes) do
          Rails.logger.info "CACHE MISS: Generating users_with_pagination for #{cache_key}"
          base_query = User.includes(:roles, :account)
          @q = base_query.ransack(search_params)
          @q.sorts = 'id desc' if @q.sorts.empty?
          
          # Handle pagination with proper page parameter
          page = params[:page] || 1
          per_page = params[:per_page] || 12

          @pagy, @users = pagy(@q.result(distinct: true), page: page, limit: per_page)
          
          users = @users.map do |user|
            user_data = user.as_json(
              only: [:id, :username, :fullname, :identification, :phone_number, :created_at, :updated_at]
            )
            user_data['email'] = user.account.email
            user_data['verified'] = user.account.status == 'verified'
            user_data['account_status'] = user.account.status
            user_data['roles'] = user.roles.pluck(:name)
            user_data
          end
          
          {
            users: users,
            pagination: {
              current_page: @pagy.page,
              total_pages: @pagy.pages,
              total_count: @pagy.count,
              per_page: @pagy.limit
            }
          }
        end

        render json: {
          status: :success,
          users: users_with_pagination[:users],
          pagination: users_with_pagination[:pagination]
        }
      end

      # GET /api/v1/users/:id
      def show
        cache_key = "user:#{@user.id}:#{@user.updated_at.to_i}"
        user_data = Rails.cache.fetch(cache_key, expires_in: 10.minutes) do
          data = @user.as_json(only: [:id, :username, :fullname, :identification, :phone_number, :created_at, :updated_at])
          data['email'] = @user.account.email
          data['verified'] = @user.account.status == 'verified'
          data['account_status'] = @user.account.status
          data['roles'] = @user.roles.pluck(:name)
          data
        end
        
        render json: { status: :success, user: user_data }
      end

      # POST /api/v1/users
      def create
        # Create account with VERIFIED status (admin-created users are pre-verified)
        account_params = {
          email: user_params[:email],
          status: 2 # ✅ Status 2 = verified (admin-created users are automatically verified)
        }

        # Add password if provided, otherwise generate a random one
        if user_params[:password].present?
          require 'bcrypt'
          account_params[:password_hash] = BCrypt::Password.create(user_params[:password], cost: 12)
        else
          # Generate a random password that the user will reset via "Forgot Password"
          random_password = SecureRandom.hex(16)
          require 'bcrypt'
          account_params[:password_hash] = BCrypt::Password.create(random_password, cost: 12)
        end

        account = Account.new(account_params)

        if account.save
          @user = User.new(user_params.except(:email, :password, :password_confirmation))
          @user.account = account

          if @user.save
            assign_roles if params[:roles].present?

            # Clear related caches
            Rails.cache.delete_matched("users:index*")

            # ✅ Send welcome invitation email (NOT verification email)
            EmailNotificationJob.perform_later(@user.id, 'admin_invitation')

            user_data = @user.as_json(only: [:id, :username, :fullname, :identification, :phone_number, :created_at, :updated_at])
            user_data['email'] = account.email
            user_data['verified'] = true # Always true for admin-created users
            user_data['account_status'] = 'verified'
            user_data['roles'] = @user.roles.pluck(:name)

            render json: { status: :success, user: user_data }, status: :created
          else
            account.destroy # Cleanup account if user creation fails
            render json: { status: :error, errors: @user.errors.full_messages }, status: :unprocessable_entity
          end
        else
          render json: { status: :error, errors: account.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PUT /api/v1/users/:id
      def update
        # Handle email updates on account
        account_update_needed = user_params[:email].present? && user_params[:email] != @user.account.email
        
        if account_update_needed
          unless @user.account.update(email: user_params[:email])
            return render json: { status: :error, errors: @user.account.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # Update user fields (excluding email)
        user_update_params = user_params.except(:email)
        
        if @user.update(user_update_params)
          update_roles if params[:roles].present? && !params[:roles].empty?
          
          # Clear related caches
          Rails.cache.delete_matched("users:index*")
          Rails.cache.delete("user:#{@user.id}:*")
          
          # Make sure to include the current data in the response
          user_data = @user.as_json(only: [:id, :username, :fullname, :identification, :phone_number, :created_at, :updated_at])
          user_data['email'] = @user.account.email
          user_data['verified'] = @user.account.status == 'verified'
          user_data['account_status'] = @user.account.status
          user_data['roles'] = @user.roles.pluck(:name)
          
          render json: { status: :success, user: user_data }
        else
          render json: { status: :error, errors: @user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/users/:id
      def destroy
        if @user.id == current_rodauth_user.id
          return render json: { status: :error, message: 'No puedes eliminar tu propio usuario' }, status: :forbidden
        end
        
        # Prevent managers from deleting other managers
        if @user.has_role?(:manager) && !current_rodauth_user.has_role?(:admin)
          return render json: { status: :error, message: 'Solo los administradores pueden eliminar usuarios gerentes' }, status: :forbidden
        end
              
        # Store account reference before destroying user
        account = @user.account
                  
        if @user.destroy
          # Also ensure the account is properly destroyed
          account.destroy if account && !account.destroyed?
          
          # Clear related caches
          Rails.cache.delete_matched("users:index*")
          Rails.cache.delete("user:#{@user.id}:*")
          
          render json: { status: :success, message: 'Usuario eliminado correctamente' }
        else
          render json: { status: :error, message: 'No se pudo eliminar el usuario' }, status: :unprocessable_entity
        end
      end

      # PUT /api/v1/users/:id/toggle_confirmation
      def toggle_confirmation
        # If confirming (setting to verified)
        if params[:confirmed] == true || params[:confirmed] == "true"
          # If not already verified
          if @user.account.status != 'verified'
            @user.account.update!(status: 'verified')
            Rails.cache.delete_matched("users:index*")
            Rails.cache.delete("user:#{@user.id}:*")
            render json: { 
              status: :success, 
              message: 'Usuario confirmado correctamente', 
              verified: true,
              account_status: @user.account.status
            }
          else
            render json: { 
              status: :success, 
              message: 'El usuario ya está confirmado', 
              verified: true,
              account_status: @user.account.status
            }
          end
        else
          # If unconfirming (setting to unverified)
          if @user.has_role?(:admin) && !current_rodauth_user.has_role?(:admin)
            return render json: { status: :error, message: 'No puedes desconfirmar a un administrador' }, status: :forbidden
          end

          # Prevent unconfirming yourself
          if @user.id == current_rodauth_user.id
            return render json: { status: :error, message: 'No puedes desconfirmar tu propio usuario' }, status: :forbidden
          end

          @user.account.update!(status: 'unverified')
          Rails.cache.delete_matched("users:index*")
          Rails.cache.delete("user:#{@user.id}:*")
          render json: { 
            status: :success, 
            message: 'Usuario desconfirmado correctamente', 
            verified: false,
            account_status: @user.account.status
          }
        end
      end

      # PUT /api/v1/users/:id/update_password
      def update_password
        if user_password_params[:password].blank?
          render json: { status: :error, message: 'La contraseña no puede estar vacía' }, status: :unprocessable_entity
          return
        end

        # Actualizar la contraseña usando la lógica de Rodauth (si usas el mixin model)
        if @user.account.update(password: user_password_params[:password])
          render json: { status: :success, message: 'Contraseña actualizada correctamente' }
        else
          render json: { status: :error, errors: @user.account.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/users/export
      def export
        # Note: For synchronous export (current implementation)
        # Consider using UserExportJob.perform_later(search_params) for async processing
        # with ActionCable notifications or email delivery when dealing with large datasets

        base_query = User.includes(:roles, :account)
        @q = base_query.ransack(search_params)
        @q.sorts = 'id desc' if @q.sorts.empty?
        users = @q.result(distinct: true)

        # For now, we keep it synchronous for immediate download
        # If you need async processing, use:
        # UserExportJob.perform_later(search_params)
        xlsx_data = UserExportService.to_xlsx(users)

        send_data xlsx_data,
                  filename: "usuarios_#{Time.current.strftime('%Y%m%d_%H%M%S')}.xlsx",
                  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      end


      private

      def set_user
        @user = User.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { status: :error, message: 'Usuario no encontrado' }, status: :not_found
      end

      def user_params
        params.require(:user).permit(
          :email,
          :username,
          :fullname,
          :identification,
          :phone_number,
          :password,
          :password_confirmation
        )
      end

      def authorize_show
        # Users can only show their own profile unless they're admin/manager
        unless current_rodauth_user&.has_role?(:admin) || current_rodauth_user&.has_role?(:manager) || @user.id == current_rodauth_user&.id
          render json: { status: :error, message: 'No tienes permiso para ver este usuario' }, status: :forbidden
        end
      end

      def check_admin_user_modification
        # If the target user is an admin AND the current user is not an admin
        if @user.has_role?(:admin) && !current_rodauth_user&.has_role?(:admin)
          render json: { status: :error, message: 'No tienes permiso para modificar usuarios administradores' }, status: :forbidden
        end
      end

      def check_self_role_elevation
        # Only check when updating roles for yourself
        if @user.id == current_rodauth_user&.id && params[:roles].present?
          # Get current roles and requested roles
          current_roles = current_rodauth_user.roles.pluck(:name)
          requested_roles = params[:roles].split(',').map(&:strip)
          
          # Check if user is trying to add roles they don't currently have
          new_roles = requested_roles - current_roles
          
          if new_roles.any?
            render json: { 
              status: :error, 
              message: 'No puedes elevar tus propios privilegios'
            }, status: :forbidden
            return true
          end
        end
        
        return false
      end

      def assign_roles
        # Store current roles if user is updating themselves
        current_user_roles = @user.id == current_rodauth_user&.id ? @user.roles.pluck(:name) : []
        
        # Clear existing roles first
        @user.roles.clear
        
        # Assign new roles
        roles_to_assign = params[:roles].split(',').map(&:strip)
        
        # If user is updating themselves, ensure they keep their existing roles
        if @user.id == current_rodauth_user&.id
          roles_to_assign = (roles_to_assign + current_user_roles).uniq
        end
        
        roles_to_assign.each do |role_name|
          role = Role.find_by(name: role_name)
          
          # Prevent managers from assigning admin role
          if role&.name == 'admin' && !current_rodauth_user&.has_role?(:admin)
            next # Skip adding the admin role
          end
          
          @user.roles << role if role
        end
      end

      def update_roles
        # Make sure current roles are preserved if user is updating themselves
        if @user.id == current_rodauth_user&.id
          # Manager users cannot modify their own roles
          if current_rodauth_user.has_role?(:manager) && !current_rodauth_user.has_role?(:admin)
            return render json: { 
              status: :error, 
              message: 'Los gerentes no pueden modificar sus propios roles' 
            }, status: :forbidden
          end
        end
        
        # Store existing roles for potential restoration
        existing_roles = @user.roles.pluck(:name)
        
        # Check if non-admin is trying to remove manager role from a manager
        if !current_rodauth_user&.has_role?(:admin) && 
           current_rodauth_user&.has_role?(:manager) &&
           existing_roles.include?('manager')
           
          requested_roles = params[:roles].split(',').map(&:strip)
          
          # If request doesn't include 'manager' but user was a manager before
          if !requested_roles.include?('manager')
            return render json: { 
              status: :error, 
              message: 'Solo los administradores pueden quitar el rol de gerente' 
            }, status: :forbidden
          end
        end
        
        # After security checks, assign roles normally
        assign_roles
      end

      def search_params
        # Start with an empty hash
        search = {}

        # Add role filtering
        if params[:role].present?
          search[:roles_name_eq] = params[:role]
        end

        # Add general search term that searches across multiple fields
        if params[:search].present?
          search[:fullname_or_username_or_account_email_cont] = params[:search]
        end

        # Add specific field searches if they exist
        search[:fullname_cont] = params[:fullname] if params[:fullname].present?
        search[:username_cont] = params[:username] if params[:username].present?
        search[:account_email_cont] = params[:email] if params[:email].present?

        # Return the search params
        search
      end

      def user_password_params
        params.require(:user).permit(:password, :password_confirmation)
      end
    end
  end
end