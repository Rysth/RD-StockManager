module Api
  module V1
    class BusinessesController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_BUSINESS) }, only: [:current, :show]
      before_action -> { authorize_permission!(Permission::EDIT_BUSINESS) }, only: [:update]
      before_action :set_business, only: [:show, :update]
      after_action :clear_cache, only: [:update]

      # GET /api/v1/businesses/current
      def current
        cache_key = "business:current"
        business_data = Rails.cache.fetch(cache_key, expires_in: 5.minutes) do
          Rails.logger.info "CACHE MISS: Generating business data for #{cache_key}"
          @business = Business.current
          business_json(@business)
        end
        
        render json: business_data
      end

      # GET /api/v1/businesses/1
      def show
        render json: business_json(@business)
      end

      # PUT/PATCH /api/v1/businesses/1
      def update
        update_params = business_params.except(:logo)
        
        if @business.update(update_params)
          if params[:logo].present?
            CloudflareBusinessStorageService.delete_business_logo(@business)
            CloudflareBusinessStorageService.attach_business_logo(@business, params[:logo])
          end

          render json: business_json(@business)
        else
          render json: { errors: @business.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def set_business
        @business = params[:id] == 'current' ? Business.current : Business.find(params[:id])
      end

      def business_params
        params.except(:id, :controller, :action).permit(:name, :slogan, :whatsapp, :instagram, :facebook, :tiktok, :logo)
      end

      def business_json(business)
        {
          id: business.id,
          name: business.name,
          slogan: business.slogan_or_default,
          logo_url: business.logo.attached? ? url_for(business.logo) : "",
          whatsapp: business.whatsapp,
          instagram: business.instagram,
          facebook: business.facebook,
          tiktok: business.tiktok,
          created_at: business.created_at,
          updated_at: business.updated_at
        }
      end

      def clear_cache
        Rails.cache.delete("business:current")
        Rails.cache.delete("public:business:current")
      end
    end
  end
end