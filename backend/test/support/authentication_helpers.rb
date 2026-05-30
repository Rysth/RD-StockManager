# frozen_string_literal: true

module AuthenticationHelpers
  # Create a user with specific role for testing
  def create_user_with_role(role, attributes = {})
    user = create_authenticated_user(role: role, attributes: attributes)
    user
  end

  # Create admin user for testing
  def create_admin_user(attributes = {})
    create_user_with_role(:admin, attributes)
  end

  # Create manager user for testing
  def create_manager_user(attributes = {})
    create_user_with_role(:manager, attributes)
  end

  # Create regular user for testing
  def create_regular_user(attributes = {})
    create_user_with_role(:user, attributes)
  end

  # Check if user has specific role
  def assert_user_has_role(user, role)
    assert user.has_role?(role), "Expected user to have role: #{role}"
  end

  # Check if user doesn't have specific role
  def assert_user_lacks_role(user, role)
    assert_not user.has_role?(role), "Expected user to not have role: #{role}"
  end

  # Generate JWT token for API testing
  def generate_jwt_token(user)
    # Create a simple JWT-like token for testing
    # In a real implementation, this would use proper JWT libraries
    payload = {
      account_id: user.account.id,
      user_id: user.id,
      email: user.account.email,
      username: user.username,
      roles: user.roles.pluck(:name),
      exp: (Time.current + 1.hour).to_i
    }
    
    # Simple base64 encoding for testing purposes
    # In production, use proper JWT signing
    Base64.strict_encode64(payload.to_json)
  end

  # Create authorization header with JWT token
  def jwt_auth_header(user)
    token = generate_jwt_token(user)
    { 'Authorization' => "Bearer #{token}" }
  end

  # Simulate user login with session
  def simulate_login(user)
    # Create a mock rodauth session for the user
    rodauth_mock = create_rodauth_mock(user, authenticated: true)
    @current_test_user = user
    @current_rodauth_mock = rodauth_mock
    
    # Set session data if available
    if defined?(session) && session
      session[:account_id] = user.account.id
    end
    
    user
  end

  # Simulate user logout
  def simulate_logout
    # Create a mock rodauth object for unauthenticated state
    rodauth_mock = create_rodauth_mock(nil, authenticated: false)
    @current_test_user = nil
    @current_rodauth_mock = rodauth_mock
    
    # Clear session data if available
    if defined?(session) && session
      session.clear
    end
  end

  # Create authenticated request with proper headers
  def authenticated_api_request(method, path, user:, params: {}, headers: {})
    auth_headers = jwt_auth_header(user).merge(headers)
    simulate_login(user)
    
    case method.to_sym
    when :get
      get path, params: params, headers: auth_headers
    when :post
      post path, params: params.to_json, headers: auth_headers
    when :put
      put path, params: params.to_json, headers: auth_headers
    when :patch
      patch path, params: params.to_json, headers: auth_headers
    when :delete
      delete path, params: params, headers: auth_headers
    else
      send(method, path, params: params, headers: auth_headers)
    end
  end

  # Create unauthenticated request
  def unauthenticated_api_request(method, path, params: {}, headers: {})
    simulate_logout
    
    case method.to_sym
    when :get
      get path, params: params, headers: headers
    when :post
      post path, params: params.to_json, headers: headers
    when :put
      put path, params: params.to_json, headers: headers
    when :patch
      patch path, params: params.to_json, headers: headers
    when :delete
      delete path, params: params, headers: headers
    else
      send(method, path, params: params, headers: headers)
    end
  end

  # Role-based authentication helpers
  def login_as_admin(attributes = {})
    user = create_admin_user(attributes)
    simulate_login(user)
    user
  end

  def login_as_manager(attributes = {})
    user = create_manager_user(attributes)
    simulate_login(user)
    user
  end

  def login_as_user(attributes = {})
    user = create_regular_user(attributes)
    simulate_login(user)
    user
  end

  # Simulate authentication failure
  def simulate_auth_failure
    simulate_logout
    # Mock rodauth to raise authentication error
    rodauth_mock = Object.new
    rodauth_mock.define_singleton_method(:require_authentication) do
      raise StandardError, "Authentication required"
    end
    
    if defined?(@controller) && @controller
      @controller.define_singleton_method(:rodauth) { rodauth_mock }
    end
  end

  # Assert that an action requires authentication
  def assert_requires_authentication(method, path, params: {})
    unauthenticated_api_request(method, path, params: params)
    assert_response :unauthorized
  end

  # Assert that an action requires specific role
  def assert_requires_role(role, method, path, params: {})
    user = create_authenticated_user # User without the required role
    authenticated_api_request(method, path, user: user, params: params)
    assert_response :forbidden
  end

  # Assert that user has admin access
  def assert_admin_access(method, path, params: {})
    admin_user = create_admin_user
    authenticated_api_request(method, path, user: admin_user, params: params)
    assert_response :success
  end

  # Assert that user has manager access
  def assert_manager_access(method, path, params: {})
    manager_user = create_manager_user
    authenticated_api_request(method, path, user: manager_user, params: params)
    assert_response :success
  end

  # Verify role-based access control
  def verify_role_access(method, path, allowed_roles: [], params: {})
    # Test each allowed role has access
    allowed_roles.each do |role|
      user = create_user_with_role(role)
      authenticated_api_request(method, path, user: user, params: params)
      assert_response :success, "Expected #{role} to have access"
    end
    
    # Test that regular user without role is denied
    unless allowed_roles.include?(:user)
      regular_user = create_regular_user
      authenticated_api_request(method, path, user: regular_user, params: params)
      assert_response :forbidden, "Expected regular user to be denied access"
    end
  end

  private

  # Create a mock rodauth object for testing
  def create_rodauth_mock(user, authenticated: false)
    rodauth_mock = Object.new
    
    if authenticated && user
      rodauth_mock.define_singleton_method(:authenticated?) { true }
      rodauth_mock.define_singleton_method(:logged_in?) { true }
      rodauth_mock.define_singleton_method(:rails_account) { user.account }
      rodauth_mock.define_singleton_method(:require_authentication) { true }
      rodauth_mock.define_singleton_method(:account_id) { user.account.id }
      rodauth_mock.define_singleton_method(:session_value) { user.account.id }
      rodauth_mock.define_singleton_method(:account) { user.account }
    else
      rodauth_mock.define_singleton_method(:authenticated?) { false }
      rodauth_mock.define_singleton_method(:logged_in?) { false }
      rodauth_mock.define_singleton_method(:rails_account) { nil }
      rodauth_mock.define_singleton_method(:account_id) { nil }
      rodauth_mock.define_singleton_method(:session_value) { nil }
      rodauth_mock.define_singleton_method(:account) { nil }
      rodauth_mock.define_singleton_method(:require_authentication) do
        raise StandardError, "Authentication required"
      end
    end
    
    rodauth_mock
  end
end