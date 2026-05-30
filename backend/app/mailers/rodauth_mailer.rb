class RodauthMailer < ApplicationMailer
  def verify_account(email_to, subject_line, token)
    @token = token
    @email = email_to
    mail(
      to: email_to,
      subject: subject_line,
      template_path: "rodauth_mailer",
      template_name: "verify_account"
    ) do |format|
      format.html
      format.text { render "verify_account" }
    end
  end

  def reset_password(email_to, subject_line, token)
    @token = token
    @email = email_to
    mail(
      to: email_to,
      subject: subject_line,
      template_path: "rodauth_mailer",
      template_name: "reset_password"
    ) do |format|
      format.html
      format.text { render "reset_password" }
    end
  end

  # ✅ NEW: Admin invitation email (no verification needed)
  def admin_invitation(email_to, fullname, subject_line)
    @email = email_to
    @fullname = fullname
    @frontend_url = FrontendUrls.admin_url
    
    mail(
      to: email_to,
      subject: subject_line,
      template_path: "rodauth_mailer",
      template_name: "admin_invitation"
    ) do |format|
      format.html
      format.text { render "admin_invitation" }
    end
  end

  def account_lockout(email_to, subject_line, lockout_duration, unlock_time)
    @email = email_to
    @lockout_duration = lockout_duration
    @unlock_time = unlock_time

    mail(
      to: email_to,
      subject: subject_line,
      template_path: "rodauth_mailer",
      template_name: "account_lockout"
    ) do |format|
      format.html
      format.text { render "account_lockout" }
    end
  end
end