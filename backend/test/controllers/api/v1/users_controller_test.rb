require 'test_helper'

module Api
  module V1
    class UsersControllerTest < ActionDispatch::IntegrationTest
      setup do
        @admin_user = create_admin_user
        @manager_user = create_manager_user
        @regular_user = create_regular_user
        @another_user = create_regular_user(username: 'another_user', email: 'another@test.com')
      end

      # INDEX ACTION TESTS
      test "index should require authentication" do
        unauthenticated_request(:get, '/api/v1/users')
        assert_unauthorized
      end

      test "index should require admin or manager role" do
        authenticated_request(:get, '/api/v1/users', user: @regular_user)
        assert_forbidden
      end

      test "index should return paginated users for admin" do
        authenticated_request(:get, '/api/v1/users', user: @admin_user)
        assert_response :success
        
        json = json_response
        assert_equal 'success', json['status']
        assert json.key?('users')
        assert json.key?('pagination')
        assert json['users'].is_a?(Array)
        assert json['pagination'].key?('current_page')
        assert json['pagination'].key?('total_pages')
        assert json['pagination'].key?('total_count')
        assert json['pagination'].key?('per_page')
      end

      test "index should return paginated users for manager" do
        authenticated_request(:get, '/api/v1/users', user: @manager_user)
        assert_response :success
        
        json = json_response
        assert_equal 'success', json['status']
        assert json.key?('users')
        assert json.key?('pagination')
      end

      test "index should support pagination parameters" do
        authenticated_request(:get, '/api/v1/users', 
                             user: @admin_user, 
                             params: { page: 1, per_page: 2 })
        assert_response :success
        
        json = json_response
        assert_equal 1, json['pagination']['current_page']
        assert_equal 2, json['pagination']['per_page']
      end

      test "index should support search functionality" do
        authenticated_request(:get, '/api/v1/users', 
                             user: @admin_user, 
                             params: { search: @regular_user.fullname })
        assert_response :success
        
        json = json_response
        assert json['users'].any? { |u| u['fullname'].include?(@regular_user.fullname) }
      end

      test "index should support role filtering" do
        authenticated_request(:get, '/api/v1/users', 
                             user: @admin_user, 
                             params: { role: 'admin' })
        assert_response :success
        
        json = json_response
        admin_users = json['users'].select { |u| u['roles'].include?('admin') }
        assert admin_users.any?
      end

      # SHOW ACTION TESTS
      test "show should require authentication" do
        unauthenticated_request(:get, "/api/v1/users/#{@regular_user.id}")
        assert_unauthorized
      end

      test "show should allow admin to view any user" do
        authenticated_request(:get, "/api/v1/users/#{@regular_user.id}", user: @admin_user)
        assert_response :success
        
        json = json_response
        assert_equal 'success', json['status']
        assert_equal @regular_user.id, json['user']['id']
        assert_equal @regular_user.username, json['user']['username']
        assert_equal @regular_user.account.email, json['user']['email']
      end

      test "show should allow manager to view any user" do
        authenticated_request(:get, "/api/v1/users/#{@regular_user.id}", user: @manager_user)
        assert_response :success
        
        json = json_response
        assert_equal 'success', json['status']
        assert_equal @regular_user.id, json['user']['id']
      end

      test "show should allow user to view their own profile" do
        authenticated_request(:get, "/api/v1/users/#{@regular_user.id}", user: @regular_user)
        assert_response :success
        
        json = json_response
        assert_equal 'success', json['status']
        assert_equal @regular_user.id, json['user']['id']
      end

      test "show should forbid regular user from viewing other users" do
        authenticated_request(:get, "/api/v1/users/#{@another_user.id}", user: @regular_user)
        assert_forbidden
      end

      test "show should return 404 for non-existent user" do
        authenticated_request(:get, "/api/v1/users/99999", user: @admin_user)
        assert_not_found
      end

      # CREATE ACTION TESTS
      test "create should require authentication" do
        unauthenticated_request(:post, '/api/v1/users', 
                               params: { user: { email: 'new@test.com', username: 'newuser' } })
        assert_unauthorized
      end

      test "create should require admin or manager role" do
        authenticated_request(:post, '/api/v1/users', 
                             user: @regular_user,
                             params: { user: { email: 'new@test.com', username: 'newuser' } })
        assert_forbidden
      end

      test "create should create user with account for admin" do
        user_params = {
          email: 'newuser@test.com',
          username: 'newuser',
          fullname: 'New User',
          password: 'password123'
        }

        assert_difference ['User.count', 'Account.count'], 1 do
          authenticated_request(:post, '/api/v1/users', 
                               user: @admin_user,
                               params: { user: user_params })
        end

        assert_response :created
        json = json_response
        assert_equal 'success', json['status']
        assert_equal 'newuser@test.com', json['user']['email']
        assert_equal 'newuser', json['user']['username']
        assert_equal true, json['user']['verified'] # Admin-created users are pre-verified
      end

      test "create should assign roles when provided" do
        user_params = {
          email: 'manager@test.com',
          username: 'managernew',
          fullname: 'Manager User'
        }

        authenticated_request(:post, '/api/v1/users', 
                             user: @admin_user,
                             params: { user: user_params, roles: 'manager' })

        assert_response :created
        json = json_response
        assert json['user']['roles'].include?('manager')
      end

      test "create should prevent manager from assigning admin role" do
        user_params = {
          email: 'admin@test.com',
          username: 'adminuser',
          fullname: 'Admin User'
        }

        authenticated_request(:post, '/api/v1/users', 
                             user: @manager_user,
                             params: { user: user_params, roles: 'admin' })

        assert_response :created
        json = json_response
        assert_not json['user']['roles'].include?('admin')
      end

      test "create should return validation errors for invalid data" do
        user_params = {
          email: 'invalid-email',
          username: '', # Invalid username
          fullname: 'Test User'
        }

        authenticated_request(:post, '/api/v1/users', 
                             user: @admin_user,
                             params: { user: user_params })

        assert_response :unprocessable_entity
        json = json_response
        assert_equal 'error', json['status']
        assert json['errors'].any?
      end

      # UPDATE ACTION TESTS
      test "update should require authentication" do
        unauthenticated_request(:put, "/api/v1/users/#{@regular_user.id}", 
                               params: { user: { fullname: 'Updated Name' } })
        assert_unauthorized
      end

      test "update should require admin or manager role" do
        authenticated_request(:put, "/api/v1/users/#{@another_user.id}", 
                             user: @regular_user,
                             params: { user: { fullname: 'Updated Name' } })
        assert_forbidden
      end

      test "update should allow admin to update any user" do
        authenticated_request(:put, "/api/v1/users/#{@regular_user.id}", 
                             user: @admin_user,
                             params: { user: { fullname: 'Updated by Admin' } })

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert_equal 'Updated by Admin', json['user']['fullname']
        
        @regular_user.reload
        assert_equal 'Updated by Admin', @regular_user.fullname
      end

      test "update should allow email updates through account" do
        new_email = 'updated@test.com'
        
        authenticated_request(:put, "/api/v1/users/#{@regular_user.id}", 
                             user: @admin_user,
                             params: { user: { email: new_email } })

        assert_response :success
        json = json_response
        assert_equal new_email, json['user']['email']
        
        @regular_user.reload
        assert_equal new_email, @regular_user.account.email
      end

      test "update should prevent admin modification by non-admin" do
        authenticated_request(:put, "/api/v1/users/#{@admin_user.id}", 
                             user: @manager_user,
                             params: { user: { fullname: 'Hacked Admin' } })

        assert_forbidden
      end

      test "update should prevent self role elevation" do
        authenticated_request(:put, "/api/v1/users/#{@manager_user.id}", 
                             user: @manager_user,
                             params: { user: { fullname: 'Updated' }, roles: 'admin' })

        assert_forbidden
      end

      test "update should return validation errors for invalid data" do
        authenticated_request(:put, "/api/v1/users/#{@regular_user.id}", 
                             user: @admin_user,
                             params: { user: { email: 'invalid-email' } })

        assert_response :unprocessable_entity
        json = json_response
        assert_equal 'error', json['status']
        assert json['errors'].any?
      end

      # DESTROY ACTION TESTS
      test "destroy should require authentication" do
        unauthenticated_request(:delete, "/api/v1/users/#{@regular_user.id}")
        assert_unauthorized
      end

      test "destroy should require admin or manager role" do
        authenticated_request(:delete, "/api/v1/users/#{@another_user.id}", user: @regular_user)
        assert_forbidden
      end

      test "destroy should allow admin to delete regular user" do
        user_to_delete = create_regular_user(username: 'todelete', email: 'delete@test.com')
        
        assert_difference ['User.count', 'Account.count'], -1 do
          authenticated_request(:delete, "/api/v1/users/#{user_to_delete.id}", user: @admin_user)
        end

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert_match /eliminado correctamente/, json['message']
      end

      test "destroy should prevent self-deletion" do
        authenticated_request(:delete, "/api/v1/users/#{@admin_user.id}", user: @admin_user)
        assert_forbidden
        
        json = json_response
        assert_match /No puedes eliminar tu propio usuario/, json['message']
      end

      test "destroy should prevent manager from deleting other managers" do
        another_manager = create_manager_user(username: 'anothermanager', email: 'manager2@test.com')
        
        authenticated_request(:delete, "/api/v1/users/#{another_manager.id}", user: @manager_user)
        assert_forbidden
        
        json = json_response
        assert_match /Solo los administradores pueden eliminar usuarios gerentes/, json['message']
      end

      # TOGGLE_CONFIRMATION ACTION TESTS
      test "toggle_confirmation should require authentication" do
        unauthenticated_request(:put, "/api/v1/users/#{@regular_user.id}/toggle_confirmation", 
                               params: { confirmed: true })
        assert_unauthorized
      end

      test "toggle_confirmation should require admin or manager role" do
        authenticated_request(:put, "/api/v1/users/#{@another_user.id}/toggle_confirmation", 
                             user: @regular_user,
                             params: { confirmed: true })
        assert_forbidden
      end

      test "toggle_confirmation should confirm unverified user" do
        # Create unverified user
        unverified_user = create_authenticated_user
        unverified_user.account.update!(status: 'unverified')
        
        authenticated_request(:put, "/api/v1/users/#{unverified_user.id}/toggle_confirmation", 
                             user: @admin_user,
                             params: { confirmed: true })

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert_equal true, json['verified']
        assert_equal 'verified', json['account_status']
        
        unverified_user.reload
        assert_equal 'verified', unverified_user.account.status
      end

      test "toggle_confirmation should unconfirm verified user" do
        authenticated_request(:put, "/api/v1/users/#{@regular_user.id}/toggle_confirmation", 
                             user: @admin_user,
                             params: { confirmed: false })

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert_equal false, json['verified']
        assert_equal 'unverified', json['account_status']
        
        @regular_user.reload
        assert_equal 'unverified', @regular_user.account.status
      end

      test "toggle_confirmation should prevent self-unconfirmation" do
        authenticated_request(:put, "/api/v1/users/#{@admin_user.id}/toggle_confirmation", 
                             user: @admin_user,
                             params: { confirmed: false })

        assert_forbidden
        json = json_response
        assert_match /No puedes desconfirmar tu propio usuario/, json['message']
      end

      test "toggle_confirmation should prevent manager from unconfirming admin" do
        authenticated_request(:put, "/api/v1/users/#{@admin_user.id}/toggle_confirmation", 
                             user: @manager_user,
                             params: { confirmed: false })

        assert_forbidden
        json = json_response
        assert_match /No puedes desconfirmar a un administrador/, json['message']
      end

      # UPDATE_PASSWORD ACTION TESTS
      test "update_password should require authentication" do
        unauthenticated_request(:put, "/api/v1/users/#{@regular_user.id}/update_password", 
                               params: { user: { password: 'newpassword123' } })
        assert_unauthorized
      end

      test "update_password should require admin or manager role" do
        authenticated_request(:put, "/api/v1/users/#{@another_user.id}/update_password", 
                             user: @regular_user,
                             params: { user: { password: 'newpassword123' } })
        assert_forbidden
      end

      test "update_password should update user password" do
        authenticated_request(:put, "/api/v1/users/#{@regular_user.id}/update_password", 
                             user: @admin_user,
                             params: { user: { password: 'newpassword123' } })

        assert_response :success
        json = json_response
        assert_equal 'success', json['status']
        assert_match /Contraseña actualizada correctamente/, json['message']
      end

      test "update_password should reject empty password" do
        authenticated_request(:put, "/api/v1/users/#{@regular_user.id}/update_password", 
                             user: @admin_user,
                             params: { user: { password: '' } })

        assert_response :unprocessable_entity
        json = json_response
        assert_equal 'error', json['status']
        assert_match /La contraseña no puede estar vacía/, json['message']
      end

      # EXPORT ACTION TESTS
      test "export should require authentication" do
        unauthenticated_request(:get, '/api/v1/users/export')
        assert_unauthorized
      end

      test "export should require admin or manager role" do
        authenticated_request(:get, '/api/v1/users/export', user: @regular_user)
        assert_forbidden
      end

      test "export should return xlsx file for admin" do
        authenticated_request(:get, '/api/v1/users/export', user: @admin_user)
        
        assert_response :success
        assert_equal 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                     response.content_type
        assert_match /usuarios_\d{8}_\d{6}\.xlsx/, 
                     response.headers['Content-Disposition']
      end

      test "export should support search parameters" do
        authenticated_request(:get, '/api/v1/users/export', 
                             user: @admin_user,
                             params: { search: @regular_user.fullname })
        
        assert_response :success
        assert_equal 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                     response.content_type
      end

      private

      def api_headers
        { 'Content-Type' => 'application/json', 'Accept' => 'application/json' }
      end
    end
  end
end