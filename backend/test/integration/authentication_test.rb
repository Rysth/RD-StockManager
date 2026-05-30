# frozen_string_literal: true

require 'test_helper'

class AuthenticationTest < ActionDispatch::IntegrationTest
  test "should be able to login and logout users in tests" do
    user = create_authenticated_user
    
    # Test login
    login_as(user)
    assert_equal user, current_test_user
    
    # Test logout
    logout
    assert_nil current_test_user
  end

  test "should create users with different roles" do
    admin = create_admin_user
    manager = create_manager_user
    regular = create_regular_user
    
    assert_user_has_role(admin, :admin)
    assert_user_has_role(manager, :manager)
    assert_user_has_role(regular, :user)
  end

  test "should have API helper methods available" do
    assert_respond_to self, :api_headers
    assert_respond_to self, :authenticated_request
    assert_respond_to self, :unauthenticated_request
    
    headers = api_headers
    assert_equal 'application/json', headers['Content-Type']
    assert_equal 'application/json', headers['Accept']
  end
end