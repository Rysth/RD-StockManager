module Api
  module V1
    module Public
      class BusinessesController < BaseController
        # GET /api/v1/public/business
        def show
          cache_key = "public:business:current"
          business_data = Rails.cache.fetch(cache_key, expires_in: 10.minutes) do
            Rails.logger.info "CACHE MISS: Generating business data for #{cache_key}"
            business = Business.current
            {
              id: business.id,
              name: business.name_or_default,
              slogan: business.slogan_or_default,
              logo_url: business.logo.attached? ? url_for(business.logo) : "",
              whatsapp: business.whatsapp,
              instagram: business.instagram,
              facebook: business.facebook,
              tiktok: business.tiktok
            }
          end

          render json: {
            status: :success,
            business: business_data
          }
        end
      end
    end
  end
end