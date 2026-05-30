class DataCleanupJob < ApplicationJob
  queue_as :low_priority
  
  def perform
    cleanup_expired_tokens
  end
  
  private
  
  def cleanup_expired_tokens
    # Clean up expired authentication tokens for Rodauth
    Rails.logger.info "Cleaning up expired tokens"
    
    # Remove tokens older than 30 days
    # Adjust the table/column names based on your Rodauth configuration
    Account.where('token_expires_at < ?', 30.days.ago)
           .update_all(token: nil, token_expires_at: nil)
    
    Rails.logger.info "Expired tokens cleanup completed"
  end
end