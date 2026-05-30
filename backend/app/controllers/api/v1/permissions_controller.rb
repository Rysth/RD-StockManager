module Api
  module V1
    class PermissionsController < BaseController
      before_action :authenticate_rodauth_user!

      # GET /api/v1/permissions
      # Returns all permissions grouped by group, for admin permission management UI
      def index
        authorize_permission!(Permission::VIEW_USERS)

        permissions = Permission.all.order(:group, :name).map do |perm|
          {
            id: perm.id,
            key: perm.key,
            name: perm.name,
            description: perm.description,
            group: perm.group
          }
        end

        # Also return the role-permission mapping
        roles = Role.includes(:permissions).all.map do |role|
          {
            id: role.id,
            name: role.name,
            permissions: role.permissions.pluck(:key)
          }
        end

        render json: {
          status: :success,
          permissions: permissions,
          roles: roles
        }
      end
    end
  end
end
