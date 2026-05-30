Rails.application.routes.draw do
  # Health check endpoint
  get "up" => "rails/health#show", as: :rails_health_check

  # API routes
  namespace :api do
    # V1 API routes
    namespace :v1 do
      # Authentication routes (OTP — Rodauth handles login/register/etc.)
      namespace :auth do
        post 'send-otp', to: 'otp#send_otp'
        post 'verify-otp', to: 'otp#verify_otp'
      end

      # Custom endpoint for user info (used by frontend)
      get '/me', to: 'me#show'
      
      resources :users do
        collection do
          get :export
        end
        member do
          put :toggle_confirmation
          put :update_password
        end
      end

      # Profile routes (for current user)
      namespace :profile do
        put :update_info
        put :update_password
      end

      # Dashboard stats
      namespace :dashboard do
        get :stats
      end
      
      resources :businesses, only: [:show, :update] do
        collection do
          get :current
        end
      end

      # Permissions (read-only for admin/manager UI)
      resources :permissions, only: [:index]

      # Public endpoints (no authentication)
      namespace :public do
        resource :business, only: [:show]
      end
    end


  end

  if Rails.env.development?
    mount LetterOpenerWeb::Engine, at: "/letter_opener"
    
    # Sidekiq Web UI
    require 'sidekiq/web'
    mount Sidekiq::Web => '/sidekiq'
  end
end
