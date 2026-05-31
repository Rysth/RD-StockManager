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

      # Inventory & Sales (Tienda)
      resources :categories
      resources :brands
      resources :products do
        collection do
          get :low_stock
          get :import_template
          get :export
          post :import
        end
        member do
          post :images
          delete "images/:image_id", action: :remove_image, as: :image
        end
      end
      resources :product_variants, only: [] do
        member do
          post :images
          delete "images/:image_id", action: :remove_image, as: :image
        end
      end
      resources :locations
      resources :customers
      resources :sales do
        collection do
          get :report
        end
      end
      resources :purchases do
        collection do
          get :due
        end
      end
      resources :expense_categories
      resources :expenses do
        collection do
          get :employees
          get :salary_status
        end
      end
      namespace :inventory do
        get :stats
      end

      # Informes avanzados (Tienda)
      namespace :reports do
        get :purchases
        get :taxes
        get :contacts
        get :expenses
        get :cash_register
        get :sales_reps
      end

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
