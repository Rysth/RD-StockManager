require "test_helper"

class OtpMailerTest < ActionMailer::TestCase
  setup do
    @account = accounts(:verified_user)
    @otp_code = OtpCode.create!(account: @account)
  end

  # Test email delivery
  test "should deliver send_code email" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    assert_emails 1 do
      mail.deliver_now
    end
  end

  test "should set correct email recipient" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    assert_equal [@account.email], mail.to
  end

  test "should set correct email sender" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    # Check that sender is set (exact value depends on ApplicationMailer configuration)
    assert_not_nil mail.from
    assert mail.from.any?, "Email should have a sender"
  end

  # Test email subject
  test "should have correct Spanish subject" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    assert_equal "Tu código de verificación - R&R Template", mail.subject
  end

  # Test email content includes code
  test "should include OTP code in email body" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    # Check HTML body
    html_body = mail.html_part.body.to_s
    assert_includes html_body, @otp_code.code
    
    # Check text body
    text_body = mail.text_part.body.to_s
    assert_includes text_body, @otp_code.code
  end

  test "should include expiration information in email" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    # Check HTML body for expiration info
    html_body = mail.html_part.body.to_s
    assert_includes html_body, "5 minutos"
    assert_includes html_body, "expira"
    
    # Check text body for expiration info
    text_body = mail.text_part.body.to_s
    assert_includes text_body, "5 minutos"
    assert_includes text_body, "expira"
  end

  test "should include security warnings in email" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    # Check HTML body for security warnings
    html_body = mail.html_part.body.to_s
    assert_includes html_body, "Seguridad"
    assert_includes html_body, "Nunca compartas"
    
    # Check text body for security warnings
    text_body = mail.text_part.body.to_s
    assert_includes text_body, "SEGURIDAD"
    assert_includes text_body, "Nunca compartas"
  end

  test "should include company branding" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    # Check HTML body for branding
    html_body = mail.html_part.body.to_s
    assert_includes html_body, "R&R Template"
    assert_includes html_body, "RysthDesign"
    
    # Check text body for branding
    text_body = mail.text_part.body.to_s
    assert_includes text_body, "R&R Template"
    assert_includes text_body, "RysthDesign"
  end

  # Test template rendering (HTML and text)
  test "should render both HTML and text parts" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    assert mail.multipart?, "Email should be multipart"
    assert_not_nil mail.html_part, "Email should have HTML part"
    assert_not_nil mail.text_part, "Email should have text part"
  end

  test "should render HTML template correctly" do
    mail = OtpMailer.send_code(@account, @otp_code)
    html_body = mail.html_part.body.to_s
    
    # Check for HTML structure
    assert_includes html_body, "<!DOCTYPE html>"
    assert_includes html_body, "<html>"
    assert_includes html_body, "</html>"
    
    # Check for responsive design elements
    assert_includes html_body, "max-width"
    assert_includes html_body, "container"
    
    # Check for styling
    assert_includes html_body, "<style>"
    assert_includes html_body, "font-family"
  end

  test "should render text template correctly" do
    mail = OtpMailer.send_code(@account, @otp_code)
    text_body = mail.text_part.body.to_s
    
    # Check for plain text structure (no HTML tags)
    assert_not_includes text_body, "<html>"
    assert_not_includes text_body, "<div>"
    assert_not_includes text_body, "<style>"
    
    # Check for essential content
    assert_includes text_body, "Código de Verificación"
    assert_includes text_body, @otp_code.code
    assert_includes text_body, "5 minutos"
  end

  test "should set instance variables correctly" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    # Access the mailer instance to check instance variables
    mailer = mail.delivery_method.instance_variable_get(:@mailer) || 
             ActionMailer::Base.new
    
    # We can't directly access instance variables from the mail object,
    # but we can verify the content is rendered correctly by checking
    # that the variables are used in the templates
    html_body = mail.html_part.body.to_s
    text_body = mail.text_part.body.to_s
    
    # Verify @otp_code is used
    assert_includes html_body, @otp_code.code
    assert_includes text_body, @otp_code.code
    
    # Verify @expires_in is used
    assert_includes html_body, "5 minutos"
    assert_includes text_body, "5 minutos"
  end

  test "should handle different account emails" do
    different_account = accounts(:verified_user_two)
    different_otp = OtpCode.create!(account: different_account)
    
    mail = OtpMailer.send_code(different_account, different_otp)
    
    assert_equal [different_account.email], mail.to
    assert_includes mail.html_part.body.to_s, different_otp.code
    assert_includes mail.text_part.body.to_s, different_otp.code
  end

  test "should handle special characters in email addresses" do
    # Create account with special characters (if valid)
    special_email = "test+special@example.com"
    special_account = Account.create!(
      email: special_email,
      password_hash: RodauthApp.rodauth.allocate.password_hash("password123"),
      status: :verified
    )
    special_otp = OtpCode.create!(account: special_account)
    
    mail = OtpMailer.send_code(special_account, special_otp)
    
    assert_equal [special_email], mail.to
    assert_includes mail.html_part.body.to_s, special_otp.code
  end

  test "should be deliverable" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    # Ensure the mail can be delivered without errors
    assert_nothing_raised do
      mail.deliver_now
    end
  end

  test "should have correct content type" do
    mail = OtpMailer.send_code(@account, @otp_code)
    
    assert_includes mail.content_type, "multipart/alternative"
    assert_includes mail.html_part.content_type, "text/html"
    assert_includes mail.text_part.content_type, "text/plain"
  end
end
