require 'test_helper'

class Api::V1::MeControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_authenticated_user(
      attributes: {
        username: 'meuser',
        email: 'me@example.com',
        fullname: 'Me User'
      }
    )
    @admin_user = create_admin_user
    @manager_user = create_manager_user
  end

  # SHOW ACTION TESTS
  test "show should require authentication" do
    unauthenticated_request(:get, '/api/v1/me')
    assert_unauthorized
  end

  test "show should return current user data for authenticated user" do
    authenticated_request(:get, '/api/v1/me', user: @user)
    assert_response :success
    
    json = json_response
    assert json.key?('user')
    user_data = json['user']
    
    assert_equal @user.id, user_data['id']
    assert_equal @user.account.email, user_data['email']
    assert_equal @user.username, user_data['username']
    assert_equal @user.fullname, user_data['fullname']
    assert user_data.key?('roles')
    assert user_data.key?('verified')
    assert user_data.key?('created_at')
    assert user_data.key?('updated_at')
  end

  test "show should return admin user data with admin role" do
    authenticated_request(:get, '/api/v1/me', user: @admin_user)
    assert_response :success
    
    json = json_response
    user_data = json['user']
    
    assert_equal @admin_user.id, user_data['id']
    assert_equal @admin_user.account.email, user_data['email']
    assert_equal @admin_user.username, user_data['username']
    assert_equal @admin_user.fullname, user_data['fullname']
    assert user_data['roles'].include?('admin')
    assert_equal true, user_data['verified']
  end

  test "show should return manager user data with manager role" do
    authenticated_request(:get, '/api/v1/me', user: @manager_user)
    assert_response :success
    
    json = json_response
    user_data = json['user']
    
    assert_equal @manager_user.id, user_data['id']
    assert_equal @manager_user.account.email, user_data['email']
    assert_equal @manager_user.username, user_data['username']
    assert_equal @manager_user.fullname, user_data['fullname']
    assert user_data['roles'].include?('manager')
    assert_equal true, user_data['verified']
  end

  test "show should return correct verification status for verified user" do
    @user.account.update!(status: 'verified')
    
    authenticated_request(:get, '/api/v1/me', user: @user)
    assert_response :success
    
    json = json_response
    user_data = json['user']
    assert_equal true, user_data['verified']
  end

  test "show should return correct verification status for unverified user" do
    @user.account.update!(status: 'unverified')
    
    authenticated_request(:get, '/api/v1/me', user: @user)
    assert_response :success
    
    json = json_response
    user_data = json['user']
    assert_equal false, user_data['verified']
  end

  test "show should return multiple roles for user with multiple roles" do
    @user.add_role(:manager)
    @user.add_role(:user)
    
    authenticated_request(:get, '/api/v1/me', user: @user)
    assert_response :success
    
    json = json_response
    user_data = json['user']
    assert user_data['roles'].include?('manager')
    assert user_data['roles'].include?('user')
    assert_equal 2, user_data['roles'].length
  end

  test "show should return empty roles array for user with no roles" do
    # Create user without any roles
    user_without_roles = create_authenticated_user(
      attributes: {
        username: 'noroles',
        email: 'noroles@example.com'
      }
    )
    
    authenticated_request(:get, '/api/v1/me', user: user_without_roles)
    assert_response :success
    
    json = json_response
    user_data = json['user']
    assert_equal [], user_data['roles']
  end

  test "show should handle user without account gracefully" do
    # This test simulates edge case where account might be nil
    # Mock rodauth to return nil account
    rodauth_mock = Object.new
    rodauth_mock.define_singleton_method(:rails_account) { nil }
    
    # Override the controller's rodauth method for this test
    get '/api/v1/me'
    @controller.define_singleton_method(:rodauth) { rodauth_mock } if defined?(@controller)
    
    # For integration test, we need to mock the request environment
    @request.env['rodauth'] = rodauth_mock if defined?(@request)
    
    get '/api/v1/me'
    assert_response :unauthorized
    
    json = json_response
    assert_equal 'Not authenticated', json['error']
  end

  test "show should handle user profile not found" do
    # Create account without associated user
    account = Account.create!(
      email: 'orphan@example.com',
      status: 'verified',
      password_hash: BCrypt::Password.create('password123', cost: 4)
    )
    
    # Mock rodauth to return account without user
    rodauth_mock = Object.new
    rodauth_mock.define_singleton_method(:rails_account) { account }
    
    get '/api/v1/me'
    @request.env['rodauth'] = rodauth_mock if defined?(@request)
    
    get '/api/v1/me'
    assert_response :not_found
    
    json = json_response
    assert_equal 'User profile not found', json['error']
  end

  test "show should return proper JSON structure" do
    authenticated_request(:get, '/api/v1/me', user: @user)
    assert_response :success
    
    json = json_response
    
    # Verify top-level structure
    assert json.key?('user')
    assert json.keys.length == 1
    
    # Verify user data structure
    user_data = json['user']
    expected_keys = %w[id email username fullname roles verified created_at updated_at]
    expected_keys.each do |key|
      assert user_data.key?(key), "Expected user data to include key: #{key}"
    end
  end

  test "show should return consistent data format" do
    authenticated_request(:get, '/api/v1/me', user: @user)
    assert_response :success
    
    json = json_response
    user_data = json['user']
    
    # Verify data types
    assert user_data['id'].is_a?(Integer)
    assert user_data['email'].is_a?(String)
    assert user_data['username'].is_a?(String)
    assert user_data['fullname'].is_a?(String)
    assert user_data['roles'].is_a?(Array)
    assert [true, false].include?(user_data['verified'])
    assert user_data['created_at'].is_a?(String)
    assert user_data['updated_at'].is_a?(String)
  end

  test "show should handle authentication errors gracefully" do
    # Simulate authentication failure
    simulate_auth_failure
    
    get '/api/v1/me'
    assert_response :unauthorized
    
    json = json_response
    assert json.key?('error')
  end

  test "show should work with different content types" do
    authenticated_request(:get, '/api/v1/me', 
                         user: @user,
                         headers: { 'Accept' => 'application/json' })
    assert_response :success
    assert_equal 'application/json; charset=utf-8', response.content_type
  end

  test "show should be accessible via different HTTP methods" do
    # Verify only GET is allowed
    authenticated_request(:post, '/api/v1/me', user: @user)
    assert_response :not_found # Rails returns 404 for unsupported methods on existing routes
    
    authenticated_request(:put, '/api/v1/me', user: @user)
    assert_response :not_found
    
    authenticated_request(:delete, '/api/v1/me', user: @user)
    assert_response :not_found
  end

  private

  def api_headers
    { 'Content-Type' => 'application/json', 'Accept' => 'application/json' }
  end

  def simulate_auth_failure
    logout
    # Mock rodauth to simulate authentication failure
    rodauth_mock = Object.new
    rodauth_mock.define_singleton_method(:rails_account) { nil }
    
    @request.env['rodauth'] = rodauth_mock if defined?(@request)
  end
end