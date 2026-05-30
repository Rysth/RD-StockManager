class EmailNotificationJob < ApplicationJob
  queue_as :default
  
  retry_on Net::ReadTimeout, Net::OpenTimeout,
           wait: ->(executions) { (2 ** executions).seconds },
           attempts: 5

  retry_on StandardError,
           wait: ->(executions) { (2 ** executions).seconds },
           attempts: 3
  
  def perform(user_id, notification_type, options = {})
    user = User.includes(:account).find(user_id)
    
    case notification_type
    when 'welcome'
      key = user.account.verification_key.presence || generate_verification_key(user.account)

      RodauthMailer.verify_account(
        user.account.email,
        "Verifica tu cuenta en NoviSchool",
        key
      ).deliver_now
    when 'admin_invitation'
      # ✅ NEW: For admin-created users (already verified, just need to know they have an account)
      Rails.logger.info "Sending admin invitation email to #{user.account.email}"
      
      RodauthMailer.admin_invitation(
        user.account.email,
        user.fullname,
        "¡Bienvenido a R&R Template!"
      ).deliver_now
      
      Rails.logger.info "Admin invitation email sent successfully to #{user.account.email}"
      
    when 'account_confirmation'
      # Send account confirmation reminder
      Rails.logger.info "Sending account confirmation reminder to user #{user.id}"
    else
      Rails.logger.warn "Unknown notification type: #{notification_type}"
    end
  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error "User not found: #{e.message}"
    # Don't retry if user doesn't exist
  rescue => e
    Rails.logger.error "Error sending #{notification_type} email to user #{user_id}: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    raise e # Re-raise to trigger retry
  end
end