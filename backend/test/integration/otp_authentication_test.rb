# frozen_string_literal: true

require 'test_helper'

class OtpAuthenticationTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_authenticated_user
    @account = @user.account
  end

  teardown do
    # Clean up OTP keys after each test
    begin
      DB[:account_otp_keys].where(account_id: @account.id).delete if @account
    rescue => e
      # Ignore cleanup errors
    end
  end

  # Test OTP code generation
  test "should generate OTP code on login" do
    post "/api/v1/login", params: {
      email: @account.email,
      password: "password123"
    }.to_json, headers: api_headers

    assert_response :success
    json = json_response
    assert json["otp_required"], "Expected OTP to be required"
    assert_equal @account.email, json["email"]
    assert_equal 600, json["expires_in"]
  end

  # Test OTP code validation
  test "should reject invalid OTP code format" do
    # Create OTP session first
    create_otp_session(@account)
    
    # Test with less than 6 digits
    post "/api/v1/otp-auth", params: {
      otp_auth_code: "12345"
    }.to_json, headers: api_headers
    
    assert_response :unprocessable_entity
    json = json_response
    assert_equal "invalid_format", json["error_type"]
  end

  test "should reject non-numeric OTP code" do
    create_otp_session(@account)
    
    post "/api/v1/otp-auth", params: {
      otp_auth_code: "abc123"
    }.to_json, headers: api_headers
    
    assert_response :unprocessable_entity
    json = json_response
    assert_equal "invalid_format", json["error_type"]
  end

  test "should reject missing OTP code" do
    create_otp_session(@account)
    
    post "/api/v1/otp-auth", params: {}.to_json, headers: api_headers
    
    assert_response :unprocessable_entity
    json = json_response
    assert_equal "missing_code", json["error_type"]
  end

  # Test rate limiting
  test "should enforce 1-minute rate limit for OTP resend" do
    # Create OTP session with recent timestamp
    create_otp_session(@account, created_at: 30.seconds.ago)
    
    # Try to resend immediately
    post "/api/v1/otp-auth-resend", params: {}.to_json, headers: api_headers
    
    assert_response :too_many_requests
    json = json_response
    assert_equal "rate_limited", json["error_type"]
    assert json["retry_after"], "Expected retry_after to be present"
  end

  test "should allow OTP resend after 1 minute" do
    # Create OTP session with old timestamp
    create_otp_session(@account, created_at: 2.minutes.ago)
    
    # Try to resend after 1 minute
    post "/api/v1/otp-auth-resend", params: {}.to_json, headers: api_headers
    
    assert_response :success
    json = json_response
    assert json["success"]
    assert_includes json["message"], "código"
  end

  # Test account lockout
  test "should prevent OTP resend when account is locked" do
    # Create OTP session and lock account
    create_otp_session(@account)
    lock_account(@account)
    
    # Try to resend
    post "/api/v1/otp-auth-resend", params: {}.to_json, headers: api_headers
    
    assert_response :too_many_requests
    json = json_response
    assert_equal "account_locked", json["error_type"]
    assert json["locked_until"], "Expected locked_until timestamp"
  end

  test "should reject OTP verification when account is locked" do
    # Create OTP session and lock account
    create_otp_session(@account)
    lock_account(@account)
    
    # Try to verify OTP
    post "/api/v1/otp-auth", params: {
      otp_auth_code: "123456"
    }.to_json, headers: api_headers
    
    assert_response :too_many_requests
    json = json_response
    assert_equal "account_locked", json["error_type"]
  end

  # Test expired OTP codes
  test "should reject expired OTP code" do
    # Create OTP session with expired code
    create_otp_session(@account, expires_at: 1.hour.ago)
    
    # Try to verify expired code
    post "/api/v1/otp-auth", params: {
      otp_auth_code: "123456"
    }.to_json, headers: api_headers
    
    assert_response :unauthorized
    json = json_response
    assert_equal "expired_code", json["error_type"]
  end

  private

  def create_otp_session(account, options = {})
    # Generate OTP code
    otp_code = format("%06d", SecureRandom.random_number(900000) + 100000)
    
    # Hash the code using a simple hash for testing
    # In production, Rodauth uses HMAC with the configured secret
    hashed_code = Digest::SHA256.hexdigest(otp_code)
    
    # Set default options
    created_at = options[:created_at] || Time.now
    expires_at = options[:expires_at] || (Time.now + 10.minutes)
    
    # Insert OTP key into database
    DB[:account_otp_keys].insert(
      account_id: account.id,
      key: hashed_code,
      num_failures: 0,
      last_use: created_at,
      created_at: created_at,
      expires_at: expires_at
    )
    
    otp_code
  end

  def lock_account(account)
    # Set account lockout by updating OTP key with max failures
    DB[:account_otp_keys]
      .where(account_id: account.id)
      .update(
        num_failures: 3,
        last_use: Time.now
      )
  end

  def DB
    @db ||= Sequel.postgres(extensions: :activerecord_connection, keep_reference: false)
  end
end
