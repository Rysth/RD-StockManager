class BusinessProcessingJob < ApplicationJob
  queue_as :high_priority
  
  def perform(business_id)
    business = Business.find(business_id)
    
    # Process business storage updates
    CloudflareBusinessStorageService.new(business).sync_storage
    Rails.logger.info "Updated storage for business #{business.id}"
  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error "Business not found: #{e.message}"
  rescue StandardError => e
    Rails.logger.error "Error updating business storage: #{e.message}"
    raise e
  end
end