# frozen_string_literal: true

require 'test_helper'

class RodauthMailerTest < ActionMailer::TestCase
  setup do
    @user = create_authenticated_user
    @account = @user.account
    @otp_code = "123456"
  end

  # Test OTP email delivery
  test "should send OTP authentication email with correct recipient and subject" do
    email = RodauthMailer.otp_authentication(
      @account.email,
      "Código de verificación - R&R Template",
      @otp_code
    )

    assert_equal [@account.email], email.to
    assert_equal "Código de verificación - R&R Template", email.subject
  end

  test "OTP email should include code in body" do
    email = RodauthMailer.otp_authentication(
      @account.email,
      "Código de verificación - R&R Template",
      @otp_code
    )

    # Check HTML body contains the OTP code
    assert_match @otp_code, email.html_part.body.to_s
  end

  test "OTP email should include expiration information in Spanish" do
    email = RodauthMailer.otp_authentication(
      @account.email,
      "Código de verificación - R&R Template",
      @otp_code
    )

    html_body = email.html_part.body.to_s
    
    # Check for Spanish expiration text
    assert_match /expira/i, html_body
    assert_match /10 minutos/i, html_body
  end

  test "OTP email should include security warnings in Spanish" do
    email = RodauthMailer.otp_authentication(
      @account.email,
      "Código de verificación - R&R Template",
      @otp_code
    )

    html_body = email.html_part.body.to_s
    
    # Check for security warnings
    assert_match /seguridad/i, html_body
    assert_match /no compartas/i, html_body
  end

  test "OTP email should include company branding" do
    email = RodauthMailer.otp_authentication(
      @account.email,
      "Código de verificación - R&R Template",
      @otp_code
    )

    html_body = email.html_part.body.to_s
    
    # Check for company name
    assert_match /R&R Template/i, html_body
  end

  # Test account lockout email
  test "should send account lockout notification email with correct details" do
    lockout_duration = "15 minutos"
    unlock_time = Time.now + 15.minutes
    unlock_time_formatted = unlock_time.strftime("%d/%m/%Y a las %H:%M")

    email = RodauthMailer.account_lockout(
      @account.email,
      "Cuenta bloqueada temporalmente - R&R Template",
      lockout_duration,
      unlock_time_formatted
    )

    assert_equal [@account.email], email.to
    assert_match "bloqueada", email.subject
  end

  test "account lockout email should include unlock instructions" do
    lockout_duration = "15 minutos"
    unlock_time_formatted = (Time.now + 15.minutes).strftime("%d/%m/%Y a las %H:%M")

    email = RodauthMailer.account_lockout(
      @account.email,
      "Cuenta bloqueada temporalmente - R&R Template",
      lockout_duration,
      unlock_time_formatted
    )

    html_body = email.html_part.body.to_s
    
    # Check for lockout information
    assert_match lockout_duration, html_body
    assert_match unlock_time_formatted, html_body
  end

  test "account lockout email should be in Spanish" do
    lockout_duration = "15 minutos"
    unlock_time_formatted = (Time.now + 15.minutes).strftime("%d/%m/%Y a las %H:%M")

    email = RodauthMailer.account_lockout(
      @account.email,
      "Cuenta bloqueada temporalmente - R&R Template",
      lockout_duration,
      unlock_time_formatted
    )

    html_body = email.html_part.body.to_s
    
    # Check for Spanish content
    assert_match /bloqueada/i, html_body
    assert_match /intentos/i, html_body
  end
end
