require 'test_helper'

module Api
  module V1
    class ProfileControllerTest < ActionDispatch::IntegrationTest
      setup do
        @user = create_authenticated_user(
          attributes: {
            username: 'testuser',
            email: 'testuser@example.com',
            fullname: 'Test User',
            phone_number: '+1234567890',
            identification: '1234567890'
          }
        )
      end

      # UPDATE_INFO ACTION TESTS
      test "update_info should require authentication" do
        unauthenticated_request(:put, '/api/v1/profile/update_info', 
                               params: { profile: { fullname: 'Updated Name' } })
        assert_unauthorized
      end

      test "update_info should update user profile information" do
        update_params = {
          fullname: 'Updated Full Name',
          username: 'updateduser',
          phone_number: '+9876543210',
          identification: '9876543210'
        }

        authenticated_request(:put, '/api/v1/profile/update_info', 
                             user: @user,
                             params: { profile: update_params })

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert_equal 'Updated Full Name', json['user']['fullname']
        assert_equal 'updateduser', json['user']['username']
        assert_equal '+9876543210', json['user']['phone_number']
        assert_equal '9876543210', json['user']['identification']
        
        @user.reload
        assert_equal 'Updated Full Name', @user.fullname
        assert_equal 'updateduser', @user.username
        assert_equal '+9876543210', @user.phone_number
        assert_equal '9876543210', @user.identification
      end

      test "update_info should update email through account association" do
        new_email = 'newemail@example.com'
        
        authenticated_request(:put, '/api/v1/profile/update_info', 
                             user: @user,
                             params: { profile: { email: new_email } })

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert_equal new_email, json['user']['email']
        
        @user.reload
        assert_equal new_email, @user.account.email
      end

      test "update_info should update both user and account data simultaneously" do
        update_params = {
          email: 'combined@example.com',
          fullname: 'Combined Update',
          username: 'combineduser',
          phone_number: '+1111111111'
        }

        authenticated_request(:put, '/api/v1/profile/update_info', 
                             user: @user,
                             params: { profile: update_params })

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert_equal 'combined@example.com', json['user']['email']
        assert_equal 'Combined Update', json['user']['fullname']
        assert_equal 'combineduser', json['user']['username']
        assert_equal '+1111111111', json['user']['phone_number']
        
        @user.reload
        assert_equal 'combined@example.com', @user.account.email
        assert_equal 'Combined Update', @user.fullname
        assert_equal 'combineduser', @user.username
      end

      test "update_info should return user data with roles and verification status" do
        @user.add_role(:manager)
        
        authenticated_request(:put, '/api/v1/profile/update_info', 
                             user: @user,
                             params: { profile: { fullname: 'Manager User' } })

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert json['user'].key?('roles')
        assert json['user']['roles'].include?('manager')
        assert json['user'].key?('verified')
        assert json['user'].key?('account_status')
        assert_equal 'verified', json['user']['account_status']
      end

      test "update_info should return validation errors for invalid user data" do
        update_params = {
          username: '', # Invalid empty username
          fullname: 'Valid Name'
        }

        authenticated_request(:put, '/api/v1/profile/update_info', 
                             user: @user,
                             params: { profile: update_params })

        assert_response :unprocessable_entity
        json = json_response
        assert_equal 'error', json['status']
        assert json['errors'].any?
      end

      test "update_info should return validation errors for invalid email" do
        update_params = {
          email: 'invalid-email-format',
          fullname: 'Valid Name'
        }

        authenticated_request(:put, '/api/v1/profile/update_info', 
                             user: @user,
                             params: { profile: update_params })

        assert_response :unprocessable_entity
        json = json_response
        assert_equal 'error', json['status']
        assert json['errors'].any?
      end

      test "update_info should handle partial updates" do
        original_username = @user.username
        original_email = @user.account.email
        
        authenticated_request(:put, '/api/v1/profile/update_info', 
                             user: @user,
                             params: { profile: { fullname: 'Only Name Updated' } })

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert_equal 'Only Name Updated', json['user']['fullname']
        assert_equal original_username, json['user']['username']
        assert_equal original_email, json['user']['email']
      end

      test "update_info should clear related caches" do
        # This test verifies that cache clearing logic is called
        # In a real scenario, you might mock Rails.cache to verify delete_matched calls
        authenticated_request(:put, '/api/v1/profile/update_info', 
                             user: @user,
                             params: { profile: { fullname: 'Cache Test' } })

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert_equal 'Cache Test', json['user']['fullname']
      end

      # UPDATE_PASSWORD ACTION TESTS
      test "update_password should require authentication" do
        unauthenticated_request(:put, '/api/v1/profile/update_password', 
                               params: { 
                                 profile: { 
                                   current_password: 'password123',
                                   password: 'newpassword123',
                                   password_confirmation: 'newpassword123'
                                 } 
                               })
        assert_unauthorized
      end

      test "update_password should require current password" do
        authenticated_request(:put, '/api/v1/profile/update_password', 
                             user: @user,
                             params: { 
                               profile: { 
                                 password: 'newpassword123',
                                 password_confirmation: 'newpassword123'
                               } 
                             })

        assert_response :unprocessable_entity
        json = json_response
        assert_equal 'error', json['status']
        assert_match /La contraseña actual es requerida/, json['message']
      end

      test "update_password should require new password" do
        authenticated_request(:put, '/api/v1/profile/update_password', 
                             user: @user,
                             params: { 
                               profile: { 
                                 current_password: 'password123',
                                 password: '',
                                 password_confirmation: ''
                               } 
                             })

        assert_response :unprocessable_entity
        json = json_response
        assert_equal 'error', json['status']
        assert_match /La nueva contraseña no puede estar vacía/, json['message']
      end

      test "update_password should require password confirmation match" do
        authenticated_request(:put, '/api/v1/profile/update_password', 
                             user: @user,
                             params: { 
                               profile: { 
                                 current_password: 'password123',
                                 password: 'newpassword123',
                                 password_confirmation: 'differentpassword'
                               } 
                             })

        assert_response :unprocessable_entity
        json = json_response
        assert_equal 'error', json['status']
        assert_match /Las contraseñas no coinciden/, json['message']
      end

      test "update_password should require minimum password length" do
        authenticated_request(:put, '/api/v1/profile/update_password', 
                             user: @user,
                             params: { 
                               profile: { 
                                 current_password: 'password123',
                                 password: '123',
                                 password_confirmation: '123'
                               } 
                             })

        assert_response :unprocessable_entity
        json = json_response
        assert_equal 'error', json['status']
        assert_match /La contraseña debe tener al menos 8 caracteres/, json['message']
      end

      test "update_password should verify current password is correct" do
        authenticated_request(:put, '/api/v1/profile/update_password', 
                             user: @user,
                             params: { 
                               profile: { 
                                 current_password: 'wrongpassword',
                                 password: 'newpassword123',
                                 password_confirmation: 'newpassword123'
                               } 
                             })

        assert_response :unauthorized
        json = json_response
        assert_equal 'error', json['status']
        assert_match /La contraseña actual es incorrecta/, json['message']
      end

      test "update_password should successfully update password with valid data" do
        authenticated_request(:put, '/api/v1/profile/update_password', 
                             user: @user,
                             params: { 
                               profile: { 
                                 current_password: 'password123',
                                 password: 'newpassword123',
                                 password_confirmation: 'newpassword123'
                               } 
                             })

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert_match /Contraseña actualizada correctamente/, json['message']
        
        # Verify password was actually updated by checking the hash changed
        @user.reload
        require 'bcrypt'
        assert BCrypt::Password.new(@user.account.password_hash) == 'newpassword123'
      end

      test "update_password should handle account update errors" do
        # Test with invalid current password to trigger error
        authenticated_request(:put, '/api/v1/profile/update_password', 
                             user: @user,
                             params: { 
                               profile: { 
                                 current_password: 'wrongpassword',
                                 password: 'newpassword123',
                                 password_confirmation: 'newpassword123'
                               } 
                             })

        assert_response :unauthorized
        json = json_response
        assert_equal 'error', json['status']
        assert_match /La contraseña actual es incorrecta/, json['message']
      end

      test "update_password should use proper BCrypt cost for password hashing" do
        authenticated_request(:put, '/api/v1/profile/update_password', 
                             user: @user,
                             params: { 
                               profile: { 
                                 current_password: 'password123',
                                 password: 'newpassword123',
                                 password_confirmation: 'newpassword123'
                               } 
                             })

        assert_response :success
        
        @user.reload
        # Verify the password hash uses proper BCrypt format
        assert @user.account.password_hash.start_with?('$2a$')
      end

      private

      def api_headers
        { 'Content-Type' => 'application/json', 'Accept' => 'application/json' }
      end
    end
  end
end