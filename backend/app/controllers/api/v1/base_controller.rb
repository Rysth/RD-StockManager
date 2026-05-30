module Api
  module V1
    class BaseController < ApplicationController
      # Common functionality for all V1 API controllers
      before_action :set_api_version
      
      private
      
      def set_api_version
        response.headers['API-Version'] = 'v1'
      end
      
      # Override error responses to include API version info
      def render_error(message, status = :unprocessable_entity, errors = [])
        render json: {
          status: :error,
          message: message,
          errors: errors,
          api_version: 'v1'
        }, status: status
      end
      
      def render_success(data = {}, message = nil)
        response_data = {
          status: :success,
          api_version: 'v1'
        }
        
        response_data[:message] = message if message
        response_data.merge!(data)
        
        render json: response_data
      end
    end
  end
end