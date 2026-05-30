class ApplicationMailer < ActionMailer::Base
  default from: ENV["SMTP_USER"].presence || "support@rysthdesign.com"
  layout 'mailer'
end
