class OtpMailer < ApplicationMailer
  def send_code(email, otp_code_string, expires_at)
    @otp_code = otp_code_string
    @email = email
    @expires_in = "5 minutos"
    @expires_at = expires_at

    mail(
      to: email,
      subject: "Tu código de verificación - R&R Template"
    )
  end
end
