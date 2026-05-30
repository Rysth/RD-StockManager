# frozen_string_literal: true

require 'test_helper'

class RouteParametersTest < ActionDispatch::IntegrationTest
  include AuthenticationHelpers

  def setup
    @user = create_authenticated_user
    @admin = create_admin_user
    @business = businesses(:test_business)
  end

  # Test HTTP method restrictions for each endpoint
  test "users routes only accept correct HTTP methods" do
    # GET methods should work
    authenticated_request(:get, '/api/v1/users', user: @admin)
    assert_response :success
    
    authenticated_request(:get, "/api/v1/users/#{@user.id}", user: @admin)
    assert_response :success
    
    # POST should work for create
    assert_routing({ method: 'post', path: '/api/v1/users' }, 
                   { controller: 'api/v1/users', action: 'create' })
    
    # PUT/PATCH should work for update
    assert_routing({ method: 'put', path: "/api/v1/users/#{@user.id}" }, 
                   { controller: 'api/v1/users', action: 'update', id: @user.id.to_s })
    
    # DELETE should work for destroy
    assert_routing({ method: 'delete', path: "/api/v1/users/#{@user.id}" }, 
                   { controller: 'api/v1/users', action: 'destroy', id: @user.id.to_s })
  end

  test "businesses routes only accept correct HTTP methods" do
    # GET should work for show and current
    authenticated_request(:get, "/api/v1/businesses/#{@business.id}", user: @admin)
    assert_response :success
    
    authenticated_request(:get, '/api/v1/businesses/current', user: @admin)
    assert_response :success
    
    # PUT/PATCH should work for update
    assert_routing({ method: 'put', path: "/api/v1/businesses/#{@business.id}" }, 
                   { controller: 'api/v1/businesses', action: 'update', id: @business.id.to_s })
    
    # POST and DELETE should not be available for businesses
    assert_raises(ActionController::RoutingError) do
      assert_routing({ method: 'post', path: '/api/v1/businesses' }, 
                     { controller: 'api/v1/businesses', action: 'create' })
    end
    
    assert_raises(ActionController::RoutingError) do
      assert_routing({ method: 'delete', path: "/api/v1/businesses/#{@business.id}" }, 
                     { controller: 'api/v1/businesses', action: 'destroy', id: @business.id.to_s })
    end
  end

  test "profile routes only accept PUT method" do
    # PUT should work for profile routes
    assert_routing({ method: 'put', path: '/api/v1/profile/update_info' }, 
                   { controller: 'api/v1/profile', action: 'update_info' })
    
    assert_routing({ method: 'put', path: '/api/v1/profile/update_password' }, 
                   { controller: 'api/v1/profile', action: 'update_password' })
    
    # Other methods should not be available
    assert_raises(ActionController::RoutingError) do
      assert_routing({ method: 'get', path: '/api/v1/profile/update_info' }, 
                     { controller: 'api/v1/profile', action: 'update_info' })
    end
    
    assert_raises(ActionController::RoutingError) do
      assert_routing({ method: 'post', path: '/api/v1/profile/update_info' }, 
                     { controller: 'api/v1/profile', action: 'update_info' })
    end
  end

  test "me endpoint only accepts GET method" do
    # GET should work
    assert_routing({ method: 'get', path: '/api/v1/me' }, 
                   { controller: 'api/v1/me', action: 'show' })
    
    # Other methods should not be available
    assert_raises(ActionController::RoutingError) do
      assert_routing({ method: 'post', path: '/api/v1/me' }, 
                     { controller: 'api/v1/me', action: 'create' })
    end
    
    assert_raises(ActionController::RoutingError) do
      assert_routing({ method: 'put', path: '/api/v1/me' }, 
                     { controller: 'api/v1/me', action: 'update' })
    end
  end

  # Test route parameter handling and validation
  test "user routes handle numeric ID parameters" do
    # Valid numeric ID should work
    authenticated_request(:get, "/api/v1/users/#{@user.id}", user: @admin)
    assert_response :success
    
    # Invalid ID should return 404
    authenticated_request(:get, '/api/v1/users/99999', user: @admin)
    assert_response :not_found
  end

  test "business routes handle numeric ID parameters" do
    # Valid numeric ID should work
    authenticated_request(:get, "/api/v1/businesses/#{@business.id}", user: @admin)
    assert_response :success
    
    # Invalid ID should return 404
    authenticated_request(:get, '/api/v1/businesses/99999', user: @admin)
    assert_response :not_found
  end

  test "routes handle non-numeric ID parameters gracefully" do
    # Non-numeric ID should return 404 or bad request
    authenticated_request(:get, '/api/v1/users/invalid_id', user: @admin)
    assert_includes [400, 404], response.status
    
    authenticated_request(:get, '/api/v1/businesses/invalid_id', user: @admin)
    assert_includes [400, 404], response.status
  end

  # Test nested resource route functionality
  test "users nested member routes work with correct parameters" do
    # toggle_confirmation member route
    authenticated_request(:put, "/api/v1/users/#{@user.id}/toggle_confirmation", user: @admin)
    assert_response :success
    
    # update_password member route
    authenticated_request(:put, "/api/v1/users/#{@user.id}/update_password", 
                         user: @admin,
                         params: { password: 'newpassword123', password_confirmation: 'newpassword123' })
    assert_includes [200, 422], response.status # Success or validation error
  end

  test "users collection routes work correctly" do
    # export collection route
    authenticated_request(:get, '/api/v1/users/export', user: @admin)
    assert_response :success
  end

  test "businesses collection routes work correctly" do
    # current collection route
    authenticated_request(:get, '/api/v1/businesses/current', user: @admin)
    assert_response :success
  end

  # Test route parameter constraints and validation
  test "routes reject invalid parameter formats" do
    # Test with special characters in ID
    authenticated_request(:get, '/api/v1/users/1%20OR%201=1', user: @admin)
    assert_includes [400, 404], response.status
    
    # Test with SQL injection attempt
    authenticated_request(:get, '/api/v1/users/1;DROP TABLE users;', user: @admin)
    assert_includes [400, 404], response.status
  end

  test "nested routes maintain proper parameter structure" do
    # Verify that nested routes properly extract ID parameter
    authenticated_request(:put, "/api/v1/users/#{@user.id}/toggle_confirmation", user: @admin)
    assert_response :success
    
    # Verify that the controller receives the correct ID
    # This is implicitly tested by the successful response
  end

  # Test public route parameter handling
  test "public routes handle parameters correctly" do
    # Public business route (resource, not resources)
    get '/api/v1/public/business'
    assert_response :success
    
    # Should not accept ID parameters since it's a singular resource
    # This would result in a 404 rather than a routing error in integration tests
    get '/api/v1/public/business/1'
    assert_response :not_found
  end

  # Test route precedence and conflicts
  test "collection routes take precedence over member routes with same name" do
    # /users/export should go to collection action, not member with id='export'
    authenticated_request(:get, '/api/v1/users/export', user: @admin)
    assert_response :success
    
    # Verify it's actually hitting the export action, not show with id='export'
    response_data = JSON.parse(response.body)
    # Export action should return different structure than show action
    assert response_data.key?('users') || response_data.key?('message')
  end

  test "businesses current route takes precedence over show with id='current'" do
    # /businesses/current should go to current action, not show with id='current'
    authenticated_request(:get, '/api/v1/businesses/current', user: @admin)
    assert_response :success
    
    # Verify it's hitting current action by checking response structure
    response_data = JSON.parse(response.body)
    assert_not_nil response_data['business']
  end
end