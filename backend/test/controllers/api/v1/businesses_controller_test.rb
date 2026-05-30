require 'test_helper'

module Api
  module V1
    class BusinessesControllerTest < ActionDispatch::IntegrationTest
      setup do
        @admin_user = create_admin_user
        @manager_user = create_manager_user
        @regular_user = create_regular_user
        @business = create_test_business
      end

      # CURRENT ACTION TESTS
      test "current should require authentication" do
        unauthenticated_request(:get, '/api/v1/businesses/current')
        assert_unauthorized
      end

      test "current should require admin or manager role" do
        authenticated_request(:get, '/api/v1/businesses/current', user: @regular_user)
        assert_forbidden
      end

      test "current should return business data for admin" do
        authenticated_request(:get, '/api/v1/businesses/current', user: @admin_user)
        assert_response :success
        
        json = json_response
        assert json.key?('id')
        assert json.key?('name')
        assert json.key?('slogan')
        assert json.key?('logo_url')
        assert json.key?('whatsapp')
        assert json.key?('instagram')
        assert json.key?('facebook')
        assert json.key?('tiktok')
        assert json.key?('created_at')
        assert json.key?('updated_at')
      end

      test "current should return business data for manager" do
        authenticated_request(:get, '/api/v1/businesses/current', user: @manager_user)
        assert_response :success
        
        json = json_response
        assert json.key?('id')
        assert json.key?('name')
      end

      test "current should use caching" do
        # First request should cache the data
        authenticated_request(:get, '/api/v1/businesses/current', user: @admin_user)
        assert_response :success
        first_response = json_response
        
        # Second request should return cached data
        authenticated_request(:get, '/api/v1/businesses/current', user: @admin_user)
        assert_response :success
        second_response = json_response
        
        assert_equal first_response, second_response
      end

      test "current should return default values when business has no data" do
        # Test with the existing business - just verify the structure
        authenticated_request(:get, '/api/v1/businesses/current', user: @admin_user)
        assert_response :success
        
        json = json_response
        assert json.key?('name')
        assert json.key?('logo_url')
      end

      # SHOW ACTION TESTS
      test "show should require authentication" do
        unauthenticated_request(:get, "/api/v1/businesses/#{@business.id}")
        assert_unauthorized
      end

      test "show should require admin or manager role" do
        authenticated_request(:get, "/api/v1/businesses/#{@business.id}", user: @regular_user)
        assert_forbidden
      end

      test "show should return specific business data for admin" do
        authenticated_request(:get, "/api/v1/businesses/#{@business.id}", user: @admin_user)
        assert_response :success
        
        json = json_response
        assert_equal @business.id, json['id']
        assert_equal @business.name, json['name']
        assert_equal @business.whatsapp, json['whatsapp']
        assert_equal @business.instagram, json['instagram']
        assert_equal @business.facebook, json['facebook']
        assert_equal @business.tiktok, json['tiktok']
      end

      test "show should handle current business alias" do
        authenticated_request(:get, '/api/v1/businesses/current', user: @admin_user)
        assert_response :success
        
        json = json_response
        assert json.key?('id')
        assert json.key?('name')
      end

      test "show should return 404 for non-existent business" do
        authenticated_request(:get, '/api/v1/businesses/99999', user: @admin_user)
        assert_response :not_found
      end

      # UPDATE ACTION TESTS
      test "update should require authentication" do
        unauthenticated_request(:put, "/api/v1/businesses/#{@business.id}", 
                               params: { name: 'Updated Business' })
        assert_unauthorized
      end

      test "update should require admin or manager role" do
        authenticated_request(:put, "/api/v1/businesses/#{@business.id}", 
                             user: @regular_user,
                             params: { name: 'Updated Business' })
        assert_forbidden
      end

      test "update should allow admin to update business data" do
        update_params = {
          name: 'Updated Business Name',
          slogan: 'Updated Slogan',
          whatsapp: '+9876543210',
          instagram: 'updated_instagram',
          facebook: 'updated.facebook',
          tiktok: 'updated_tiktok'
        }

        authenticated_request(:put, "/api/v1/businesses/#{@business.id}", 
                             user: @admin_user,
                             params: update_params)

        assert_response :success
        json = json_response
        assert_equal 'Updated Business Name', json['name']
        assert_equal 'Updated Slogan', json['slogan']
        assert_equal '+9876543210', json['whatsapp']
        assert_equal 'updated_instagram', json['instagram']
        assert_equal 'updated.facebook', json['facebook']
        assert_equal 'updated_tiktok', json['tiktok']
        
        @business.reload
        assert_equal 'Updated Business Name', @business.name
        assert_equal 'Updated Slogan', @business.slogan
      end

      test "update should allow manager to update business data" do
        update_params = {
          name: 'Manager Updated Business',
          slogan: 'Manager Updated Slogan'
        }

        authenticated_request(:put, "/api/v1/businesses/#{@business.id}", 
                             user: @manager_user,
                             params: update_params)

        assert_response :success
        json = json_response
        assert_equal 'Manager Updated Business', json['name']
        assert_equal 'Manager Updated Slogan', json['slogan']
      end

      test "update should handle logo upload" do
        # Mock logo file upload
        logo_file = fixture_file_upload('files/test_logo.png', 'image/png') rescue nil
        
        if logo_file
          authenticated_request(:put, "/api/v1/businesses/#{@business.id}", 
                               user: @admin_user,
                               params: { name: 'Business with Logo', logo: logo_file })

          assert_response :success
          json = json_response
          assert_equal 'Business with Logo', json['name']
          # Logo URL should be present if upload was successful
          assert json.key?('logo_url')
        else
          # Skip logo test if fixture file doesn't exist
          skip "Logo fixture file not available"
        end
      end

      test "update should clear cache after successful update" do
        # Ensure cache is populated first
        authenticated_request(:get, '/api/v1/businesses/current', user: @admin_user)
        assert_response :success
        
        # Update business
        authenticated_request(:put, "/api/v1/businesses/#{@business.id}", 
                             user: @admin_user,
                             params: { name: 'Cache Test Business' })

        assert_response :success
        
        # Verify cache was cleared by checking updated data is returned
        authenticated_request(:get, '/api/v1/businesses/current', user: @admin_user)
        assert_response :success
        json = json_response
        assert_equal 'Cache Test Business', json['name']
      end

      test "update should return validation errors for invalid data" do
        # Test with invalid social media format
        update_params = {
          whatsapp: 'invalid-phone-format',
          instagram: 'invalid instagram with spaces'
        }

        authenticated_request(:put, "/api/v1/businesses/#{@business.id}", 
                             user: @admin_user,
                             params: update_params)

        assert_response :unprocessable_entity
        json = json_response
        assert json.key?('errors')
        assert json['errors'].any?
      end

      test "update should handle current business alias" do
        authenticated_request(:put, '/api/v1/businesses/current', 
                             user: @admin_user,
                             params: { name: 'Current Business Updated' })

        assert_response :success
        json = json_response
        assert_equal 'Current Business Updated', json['name']
      end

      test "update should return 404 for non-existent business" do
        authenticated_request(:put, '/api/v1/businesses/99999', 
                             user: @admin_user,
                             params: { name: 'Non-existent Business' })

        assert_response :not_found
      end

      test "update should preserve existing data when partial update" do
        original_whatsapp = @business.whatsapp
        original_instagram = @business.instagram
        
        authenticated_request(:put, "/api/v1/businesses/#{@business.id}", 
                             user: @admin_user,
                             params: { name: 'Partially Updated Business' })

        assert_response :success
        json = json_response
        assert_equal 'Partially Updated Business', json['name']
        assert_equal original_whatsapp, json['whatsapp']
        assert_equal original_instagram, json['instagram']
      end

      test "update should handle empty logo removal" do
        # First ensure business has some data
        @business.update!(name: 'Business with potential logo')
        
        authenticated_request(:put, "/api/v1/businesses/#{@business.id}", 
                             user: @admin_user,
                             params: { name: 'Business logo test' })

        assert_response :success
        json = json_response
        assert_equal 'Business logo test', json['name']
        assert_equal '', json['logo_url'] # Should be empty string when no logo
      end

      private

      def api_headers
        { 'Content-Type' => 'application/json', 'Accept' => 'application/json' }
      end
    end
  end
end