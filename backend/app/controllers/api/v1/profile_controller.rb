module Api
  module V1
    class ProfileController < BaseController
      before_action :authenticate_rodauth_user!

      # PUT /api/v1/profile/update_info
      def update_info
        user = current_rodauth_user

        # Handle email updates on account
        account_update_needed = profile_params[:email].present? && profile_params[:email] != user.account.email

        if account_update_needed
          unless user.account.update(email: profile_params[:email])
            return render json: { status: :error, errors: user.account.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # Update user fields (excluding email)
        user_update_params = profile_params.except(:email)

        if user.update(user_update_params)
          # Clear related caches
          Rails.cache.delete_matched("users:index*")
          Rails.cache.delete("user:#{user.id}:*")

          # Return updated user data
          user_data = user.as_json(only: [:id, :username, :fullname, :identification, :phone_number, :created_at, :updated_at])
          user_data['email'] = user.account.email
          user_data['verified'] = user.account.status == 'verified'
          user_data['account_status'] = user.account.status
          user_data['roles'] = user.roles.pluck(:name)

          render json: { status: :success, user: user_data }
        else
          render json: { status: :error, errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PUT /api/v1/profile/update_password
      def update_password
        user = current_rodauth_user
        current_pwd = params.dig(:profile, :current_password)
        new_pwd = params.dig(:profile, :password)
        pwd_confirm = params.dig(:profile, :password_confirmation)

        # Validate current password is provided
        if current_pwd.blank?
          render json: { status: :error, message: 'La contraseña actual es requerida' }, status: :unprocessable_entity
          return
        end

        # Validate new password is provided
        if new_pwd.blank?
          render json: { status: :error, message: 'La nueva contraseña no puede estar vacía' }, status: :unprocessable_entity
          return
        end

        # Validate passwords match
        if new_pwd != pwd_confirm
          render json: { status: :error, message: 'Las contraseñas no coinciden' }, status: :unprocessable_entity
          return
        end

        # Validate password length
        if new_pwd.length < 8
          render json: { status: :error, message: 'La contraseña debe tener al menos 8 caracteres' }, status: :unprocessable_entity
          return
        end

        # Verify current password is correct
        require 'bcrypt'
        unless BCrypt::Password.new(user.account.password_hash) == current_pwd
          render json: { status: :error, message: 'La contraseña actual es incorrecta' }, status: :unauthorized
          return
        end

        # Hash the new password and update
        new_password_hash = BCrypt::Password.create(new_pwd, cost: BCrypt::Engine::DEFAULT_COST)

        if user.account.update(password_hash: new_password_hash)
          render json: { status: :success, message: 'Contraseña actualizada correctamente' }
        else
          render json: { status: :error, errors: user.account.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def profile_params
        params.require(:profile).permit(
          :email,
          :username,
          :fullname,
          :identification,
          :phone_number
        )
      end

      def password_params
        params.require(:profile).permit(:current_password, :password, :password_confirmation)
      end
    end
  end
end