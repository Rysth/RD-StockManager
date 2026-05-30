class OtpCleanupJob < ApplicationJob
  queue_as :default

  def perform
    deleted_count = OtpCode.expired.delete_all

    Rails.logger.info("[OTP Cleanup] Deleted #{deleted_count} expired OTP codes")

    # Reschedule the job to run again in 1 hour
    OtpCleanupJob.set(wait: 1.hour).perform_later
  end
end
