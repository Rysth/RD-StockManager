module Authorizable
  extend ActiveSupport::Concern

  private

  # Require the current user to hold **any** of the listed permission keys.
  # Usage in a controller:
  #   before_action -> { authorize_permission!(Permission::VIEW_USERS) }
  #   before_action -> { authorize_any_permission!(Permission::VIEW_USERS, Permission::EDIT_USERS) }
  def authorize_permission!(*keys)
    user = current_rodauth_user
    unless user && keys.any? { |k| user.has_permission?(k) }
      render json: {
        status: :error,
        message: "No tienes permiso para realizar esta acción"
      }, status: :forbidden
    end
  end

  # Alias that reads better when you pass multiple keys
  alias_method :authorize_any_permission!, :authorize_permission!

  # Backwards-compatible shortcut for admin or manager check.
  # Prefer `authorize_permission!` for new code.
  def authorize_admin_or_manager
    authorize_permission!(Permission::VIEW_USERS)
  end
end
