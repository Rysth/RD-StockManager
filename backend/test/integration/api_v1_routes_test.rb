# frozen_string_literal: true

require 'test_helper'

class ApiV1RoutesTest < ActionDispatch::IntegrationTest
  include AuthenticationHelpers

  def setup
    @user = create_authenticated_user
    @admin = create_admin_user
  end

  # Test users resource routes
  test "users index route maps correctly" do
    assert_routing({ method: 'get', path: '/api/v1/users' }, 
                   { controller: 'api/v1/users', action: 'index' })
  end

  test "users show route maps correctly" do
    assert_routing({ method: 'get', path: '/api/v1/users/1' }, 
                   { controller: 'api/v1/users', action: 'show', id: '1' })
  end

  test "users create route maps correctly" do
    assert_routing({ method: 'post', path: '/api/v1/users' }, 
                   { controller: 'api/v1/users', action: 'create' })
  end

  test "users update route maps correctly" do
    assert_routing({ method: 'put', path: '/api/v1/users/1' }, 
                   { controller: 'api/v1/users', action: 'update', id: '1' })
    assert_routing({ method: 'patch', path: '/api/v1/users/1' }, 
                   { controller: 'api/v1/users', action: 'update', id: '1' })
  end

  test "users destroy route maps correctly" do
    assert_routing({ method: 'delete', path: '/api/v1/users/1' }, 
                   { controller: 'api/v1/users', action: 'destroy', id: '1' })
  end

  # Test users nested actions
  test "users export collection route maps correctly" do
    assert_routing({ method: 'get', path: '/api/v1/users/export' }, 
                   { controller: 'api/v1/users', action: 'export' })
  end

  test "users toggle_confirmation member route maps correctly" do
    assert_routing({ method: 'put', path: '/api/v1/users/1/toggle_confirmation' }, 
                   { controller: 'api/v1/users', action: 'toggle_confirmation', id: '1' })
  end

  test "users update_password member route maps correctly" do
    assert_routing({ method: 'put', path: '/api/v1/users/1/update_password' }, 
                   { controller: 'api/v1/users', action: 'update_password', id: '1' })
  end

  # Test businesses resource routes
  test "businesses show route maps correctly" do
    assert_routing({ method: 'get', path: '/api/v1/businesses/1' }, 
                   { controller: 'api/v1/businesses', action: 'show', id: '1' })
  end

  test "businesses update route maps correctly" do
    assert_routing({ method: 'put', path: '/api/v1/businesses/1' }, 
                   { controller: 'api/v1/businesses', action: 'update', id: '1' })
    assert_routing({ method: 'patch', path: '/api/v1/businesses/1' }, 
                   { controller: 'api/v1/businesses', action: 'update', id: '1' })
  end

  test "businesses current collection route maps correctly" do
    assert_routing({ method: 'get', path: '/api/v1/businesses/current' }, 
                   { controller: 'api/v1/businesses', action: 'current' })
  end

  # Test profile namespace routes
  test "profile update_info route maps correctly" do
    assert_routing({ method: 'put', path: '/api/v1/profile/update_info' }, 
                   { controller: 'api/v1/profile', action: 'update_info' })
  end

  test "profile update_password route maps correctly" do
    assert_routing({ method: 'put', path: '/api/v1/profile/update_password' }, 
                   { controller: 'api/v1/profile', action: 'update_password' })
  end

  # Test me endpoint routing
  test "me endpoint route maps correctly" do
    assert_routing({ method: 'get', path: '/api/v1/me' }, 
                   { controller: 'api/v1/me', action: 'show' })
  end

  # Test route accessibility with authentication
  test "users routes require authentication" do
    unauthenticated_request(:get, '/api/v1/users')
    assert_unauthorized
    
    unauthenticated_request(:get, '/api/v1/users/1')
    assert_unauthorized
  end

  test "businesses routes require authentication" do
    unauthenticated_request(:get, '/api/v1/businesses/1')
    assert_unauthorized
    
    unauthenticated_request(:get, '/api/v1/businesses/current')
    assert_unauthorized
  end

  test "profile routes require authentication" do
    unauthenticated_request(:put, '/api/v1/profile/update_info')
    assert_unauthorized
    
    unauthenticated_request(:put, '/api/v1/profile/update_password')
    assert_unauthorized
  end

  test "me endpoint requires authentication" do
    unauthenticated_request(:get, '/api/v1/me')
    assert_unauthorized
  end

  # Test authenticated access works
  test "authenticated users can access protected routes" do
    authenticated_request(:get, '/api/v1/me', user: @user)
    assert_response :success
    
    authenticated_request(:get, '/api/v1/businesses/current', user: @user)
    assert_response :success
  end
end