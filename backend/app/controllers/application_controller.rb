class ApplicationController < ActionController::API
  include ActionController::Cookies
  include Pagy::Backend
  include Authorizable

  private

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
