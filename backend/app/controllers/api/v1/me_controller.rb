class Api::V1::MeController < ApplicationController
  def show
    # Try to get account from Rodauth first
    account = rodauth&.rails_account

    # If Rodauth doesn't have the account, try to get it from session directly
    if !account && session[:account_id]
      account = Account.find_by(id: session[:account_id])
    end

    unless account
      return render json: { error: 'Not authenticated' }, status: :unauthorized
    end

    user = account.user

    if user
      user_data = {
        id: user.id,
        email: account.email,
        username: user.username,
        fullname: user.fullname,
        roles: user.roles.pluck(:name),
        permissions: user.permission_keys,
        verified: account.status == 'verified',
        created_at: user.created_at,
        updated_at: user.updated_at
      }

      render json: { user: user_data }
    else
      render json: { error: 'User profile not found' }, status: :not_found
    end
  end

  private

  def rodauth
    request.env['rodauth']
  end
end
