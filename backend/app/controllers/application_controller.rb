class ApplicationController < ActionController::API
  include ActionController::Cookies
  include Pagy::Backend
  include Authorizable

  # Audit trail: record who performed each change, except when the actor is an
  # admin (the software vendor) — their changes are intentionally not tracked.
  around_action :with_audited_user

  private

  # Tell `audited` which user to attribute changes to, and disable auditing
  # entirely while an admin is acting so no audit rows are written for them.
  def with_audited_user
    user = current_rodauth_user

    if user&.has_role?(:admin)
      ::Audited.auditing_enabled = false
      begin
        yield
      ensure
        ::Audited.auditing_enabled = true
      end
    else
      ::Audited.audit_class.as_user(user) { yield }
    end
  end

  def current_account
    rodauth&.rails_account if rodauth&.logged_in?
  end

  def authenticate_user!
    rodauth&.require_authentication
  end

  def authenticate_rodauth_user!
    unless rodauth&.authenticated?
      render json: { status: :error, message: 'No autenticado' }, status: :unauthorized
    end
  end

  def current_rodauth_user
    rodauth = request.env['rodauth']
    return nil unless rodauth&.authenticated?

    account = rodauth.rails_account
    return nil unless account

    account.user
  end

  def rodauth
    request.env['rodauth']
  end
end
