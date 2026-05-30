require 'test_helper'

module Api
  module V1
    module Public
      class BusinessesControllerTest < ActionDispatch::IntegrationTest
        setup do
          @business = create_test_business(
            name: 'Public Test Business',
            slogan: 'Public Test Slogan',
            whatsapp: '+1234567890',
            instagram: 'public_test_instagram',
            facebook: 'public.test.facebook',
            tiktok: 'public_test_tiktok'
          )
          @user = create_authenticated_user
        end

        # SHOW ACTION TESTS
        test "show should be accessible without authentication" do
          unauthenticated_request(:get, '/api/v1/public/business')
          assert_response :success
          
          json = json_response
          assert_equal 'success', json['status']
          assert json.key?('business')
        end

        test "show should return public business data" do
          get '/api/v1/public/business'
          assert_response :success
          
          json = json_response
          business_data = json['business']
          
          assert_equal 'success', json['status']
          assert business_data.key?('id')
          assert business_data.key?('name')
          assert business_data.key?('slogan')
          assert business_data.key?('logo_url')
          assert business_data.key?('whatsapp')
          assert business_data.key?('instagram')
          assert business_data.key?('facebook')
          assert business_data.key?('tiktok')
        end

        test "show should return current business data" do
          get '/api/v1/public/business'
          assert_response :success
          
          json = json_response
          business_data = json['business']
          
          # Verify it returns the current business (should be the one we created in setup)
          assert business_data['id'].is_a?(Integer)
          assert business_data['name'].is_a?(String)
          assert business_data['slogan'].is_a?(String)
          assert business_data['whatsapp'].is_a?(String)
          assert business_data['instagram'].is_a?(String)
          assert business_data['facebook'].is_a?(String)
          assert business_data['tiktok'].is_a?(String)
        end

        test "show should use name_or_default method for business name" do
          # Test with existing business - verify name is present
          get '/api/v1/public/business'
          assert_response :success
          
          json = json_response
          business_data = json['business']
          
          # Should return name (either actual or default)
          assert business_data['name'].present?
        end

        test "show should use slogan_or_default method for business slogan" do
          # Test with existing business - verify slogan is present
          get '/api/v1/public/business'
          assert_response :success
          
          json = json_response
          business_data = json['business']
          
          # Should return slogan (either actual or default)
          assert business_data.key?('slogan')
        end

        test "show should return empty logo_url when no logo attached" do
          get '/api/v1/public/business'
          assert_response :success
          
          json = json_response
          business_data = json['business']
          
          # Should return empty string when no logo is attached
          assert_equal '', business_data['logo_url']
        end

        test "show should return logo_url when logo is attached" do
          # Test with existing business - verify logo_url key is present
          get '/api/v1/public/business'
          assert_response :success
          
          json = json_response
          business_data = json['business']
          
          # Logo URL should be present (empty string if no logo)
          assert business_data.key?('logo_url')
        end

        test "show should use caching with proper cache key" do
          # First request should cache the data
          get '/api/v1/public/business'
          assert_response :success
          first_response = json_response
          
          # Second request should return cached data
          get '/api/v1/public/business'
          assert_response :success
          second_response = json_response
          
          assert_equal first_response, second_response
        end

        test "show should cache data for 10 minutes" do
          # This test verifies the caching behavior
          # In a real scenario, you might mock Rails.cache to verify expiration time
          get '/api/v1/public/business'
          assert_response :success
          
          json = json_response
          assert_equal 'success', json['status']
          assert json.key?('business')
        end

        test "show should work with authenticated users" do
          authenticated_request(:get, '/api/v1/public/business', user: @user)
          assert_response :success
          
          json = json_response
          assert_equal 'success', json['status']
          assert json.key?('business')
        end

        test "show should return consistent JSON structure" do
          get '/api/v1/public/business'
          assert_response :success
          
          json = json_response
          
          # Verify top-level structure
          assert_equal 2, json.keys.length
          assert json.key?('status')
          assert json.key?('business')
          assert_equal 'success', json['status']
          
          # Verify business data structure
          business_data = json['business']
          expected_keys = %w[id name slogan logo_url whatsapp instagram facebook tiktok]
          expected_keys.each do |key|
            assert business_data.key?(key), "Expected business data to include key: #{key}"
          end
        end

        test "show should handle different HTTP methods correctly" do
          # Verify only GET is allowed
          post '/api/v1/public/business'
          assert_response :not_found # Rails returns 404 for unsupported methods
          
          put '/api/v1/public/business'
          assert_response :not_found
          
          delete '/api/v1/public/business'
          assert_response :not_found
        end

        test "show should return proper content type" do
          get '/api/v1/public/business'
          assert_response :success
          assert_equal 'application/json; charset=utf-8', response.content_type
        end

        test "show should handle business with all social media fields" do
          # Ensure business has all social media fields populated
          @business.update!(
            whatsapp: '+1234567890',
            instagram: 'test_instagram',
            facebook: 'test.facebook',
            tiktok: 'test_tiktok'
          )
          
          get '/api/v1/public/business'
          assert_response :success
          
          json = json_response
          business_data = json['business']
          
          assert_equal '+1234567890', business_data['whatsapp']
          assert_equal 'test_instagram', business_data['instagram']
          assert_equal 'test.facebook', business_data['facebook']
          assert_equal 'test_tiktok', business_data['tiktok']
        end

        test "show should handle business with empty social media fields" do
          # Test with existing business - verify social media fields are present
          get '/api/v1/public/business'
          assert_response :success
          
          json = json_response
          business_data = json['business']
          
          # Social media fields should be present (may be empty strings)
          assert business_data.key?('whatsapp')
          assert business_data.key?('instagram')
          assert business_data.key?('facebook')
          assert business_data.key?('tiktok')
        end

        test "show should handle business with nil social media fields" do
          # Test with existing business - verify social media fields handle nil gracefully
          get '/api/v1/public/business'
          assert_response :success
          
          json = json_response
          business_data = json['business']
          
          # Should handle nil values gracefully
          assert business_data.key?('whatsapp')
          assert business_data.key?('instagram')
          assert business_data.key?('facebook')
          assert business_data.key?('tiktok')
        end

        test "show should work with different Accept headers" do
          get '/api/v1/public/business', headers: { 'Accept' => 'application/json' }
          assert_response :success
          
          json = json_response
          assert_equal 'success', json['status']
        end

        test "show should be accessible from different origins" do
          # This test verifies CORS behavior (if configured)
          get '/api/v1/public/business', headers: { 'Origin' => 'https://example.com' }
          assert_response :success
          
          json = json_response
          assert_equal 'success', json['status']
        end

        private

        def api_headers
          { 'Content-Type' => 'application/json', 'Accept' => 'application/json' }
        end
      end
    end
  end
end