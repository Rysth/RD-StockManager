# Preview all emails at http://localhost:3000/rails/mailers/otp_mailer
class OtpMailerPreview < ActionMailer::Preview
  # Preview this email at http://localhost:3000/rails/mailers/otp_mailer/send_code
  def send_code
    OtpMailer.send_code
  end
end
