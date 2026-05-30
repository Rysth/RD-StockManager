require "test_helper"

class OtpCleanupJobTest < ActiveJob::TestCase
  setup do
    @account = accounts(:verified_user)
    @other_account = accounts(:verified_user_two)
    
    # Clean up any existing OTP codes to ensure clean test state
    OtpCode.delete_all
  end

  # Test expired code deletion
  test "should delete expired OTP codes" do
    # Create expired codes
    expired_code1 = OtpCode.create!(account: @account)
    expired_code1.update!(expires_at: 1.hour.ago)
    
    expired_code2 = OtpCode.create!(account: @other_account)
    expired_code2.update!(expires_at: 30.minutes.ago)
    
    # Create active code (should not be deleted)
    active_code = OtpCode.create!(account: @account)
    
    assert_difference "OtpCode.count", -2 do
      OtpCleanupJob.perform_now
    end
    
    # Expired codes should be deleted
    assert_not OtpCode.exists?(expired_code1.id)
    assert_not OtpCode.exists?(expired_code2.id)
    
    # Active code should remain
    assert OtpCode.exists?(active_code.id)
  end

  test "should delete codes that just expired" do
    # Create code that expires exactly now
    just_expired_code = OtpCode.create!(account: @account)
    just_expired_code.update!(expires_at: Time.current)
    
    # Wait a tiny bit to ensure it's in the past
    sleep(0.01)
    
    assert_difference "OtpCode.count", -1 do
      OtpCleanupJob.perform_now
    end
    
    assert_not OtpCode.exists?(just_expired_code.id)
  end

  test "should delete used expired codes" do
    # Create used and expired code
    used_expired_code = OtpCode.create!(account: @account)
    used_expired_code.update!(expires_at: 1.hour.ago)
    used_expired_code.mark_as_used!
    
    assert_difference "OtpCode.count", -1 do
      OtpCleanupJob.perform_now
    end
    
    assert_not OtpCode.exists?(used_expired_code.id)
  end

  # Test active code preservation
  test "should preserve active codes" do
    # Create various active codes
    active_code1 = OtpCode.create!(account: @account)
    active_code2 = OtpCode.create!(account: @other_account)
    
    # Create code that expires in the future
    future_code = OtpCode.create!(account: @account)
    future_code.update!(expires_at: 1.hour.from_now)
    
    assert_no_difference "OtpCode.count" do
      OtpCleanupJob.perform_now
    end
    
    # All active codes should remain
    assert OtpCode.exists?(active_code1.id)
    assert OtpCode.exists?(active_code2.id)
    assert OtpCode.exists?(future_code.id)
  end

  test "should preserve used but not expired codes" do
    # Create used but not expired code
    used_active_code = OtpCode.create!(account: @account)
    used_active_code.mark_as_used!
    
    assert_no_difference "OtpCode.count" do
      OtpCleanupJob.perform_now
    end
    
    assert OtpCode.exists?(used_active_code.id)
  end

  test "should handle empty database" do
    # Clear all OTP codes
    OtpCode.delete_all
    
    assert_no_difference "OtpCode.count" do
      assert_nothing_raised do
        OtpCleanupJob.perform_now
      end
    end
  end

  test "should handle database with only active codes" do
    # Clear all codes and create only active ones
    OtpCode.delete_all
    
    active_code1 = OtpCode.create!(account: @account)
    active_code2 = OtpCode.create!(account: @other_account)
    
    assert_no_difference "OtpCode.count" do
      OtpCleanupJob.perform_now
    end
    
    assert OtpCode.exists?(active_code1.id)
    assert OtpCode.exists?(active_code2.id)
  end

  test "should handle database with only expired codes" do
    # Clear all codes and create only expired ones
    OtpCode.delete_all
    
    expired_code1 = OtpCode.create!(account: @account)
    expired_code1.update!(expires_at: 1.hour.ago)
    
    expired_code2 = OtpCode.create!(account: @other_account)
    expired_code2.update!(expires_at: 2.hours.ago)
    
    assert_difference "OtpCode.count", -2 do
      OtpCleanupJob.perform_now
    end
    
    assert_equal 0, OtpCode.count
  end

  # Test logging
  test "should log deleted count" do
    # Create expired codes
    expired_code1 = OtpCode.create!(account: @account)
    expired_code1.update!(expires_at: 1.hour.ago)
    
    expired_code2 = OtpCode.create!(account: @other_account)
    expired_code2.update!(expires_at: 30.minutes.ago)
    
    # Capture log output
    log_output = capture_log do
      OtpCleanupJob.perform_now
    end
    
    assert_includes log_output, "[OTP Cleanup] Deleted 2 expired OTP codes"
  end

  test "should log zero when no codes deleted" do
    # Create only active codes
    OtpCode.create!(account: @account)
    OtpCode.create!(account: @other_account)
    
    # Capture log output
    log_output = capture_log do
      OtpCleanupJob.perform_now
    end
    
    assert_includes log_output, "[OTP Cleanup] Deleted 0 expired OTP codes"
  end

  test "should log correct count for mixed scenario" do
    # Create mix of expired and active codes
    expired_code = OtpCode.create!(account: @account)
    expired_code.update!(expires_at: 1.hour.ago)
    
    active_code = OtpCode.create!(account: @other_account)
    
    # Capture log output
    log_output = capture_log do
      OtpCleanupJob.perform_now
    end
    
    assert_includes log_output, "[OTP Cleanup] Deleted 1 expired OTP codes"
  end

  # Test job scheduling
  test "should be enqueueable" do
    assert_enqueued_with(job: OtpCleanupJob) do
      OtpCleanupJob.perform_later
    end
  end

  test "should use default queue" do
    job = OtpCleanupJob.new
    assert_equal "default", job.queue_name
  end

  test "should schedule next job after completion" do
    # This tests the self-scheduling behavior in the job
    assert_enqueued_with(job: OtpCleanupJob, at: 1.hour.from_now) do
      OtpCleanupJob.perform_now
    end
  end

  # Test error handling
  test "should handle database errors gracefully" do
    # Mock a database error
    OtpCode.stub :expired, -> { raise ActiveRecord::StatementInvalid.new("Database error") } do
      assert_raises ActiveRecord::StatementInvalid do
        OtpCleanupJob.perform_now
      end
    end
  end

  test "should handle concurrent deletions" do
    # Create expired code
    expired_code = OtpCode.create!(account: @account)
    expired_code.update!(expires_at: 1.hour.ago)
    
    # Delete the code before the job runs (simulating concurrent deletion)
    expired_code.destroy
    
    # Job should handle this gracefully
    assert_no_difference "OtpCode.count" do
      assert_nothing_raised do
        OtpCleanupJob.perform_now
      end
    end
  end

  # Test performance with large datasets
  test "should handle large number of expired codes efficiently" do
    # Create many expired codes
    50.times do |i|
      code = OtpCode.create!(account: @account)
      code.update!(expires_at: (i + 1).minutes.ago)
    end
    
    # Create some active codes
    5.times do
      OtpCode.create!(account: @other_account)
    end
    
    assert_difference "OtpCode.count", -50 do
      # Should complete without timeout
      Timeout::timeout(5) do
        OtpCleanupJob.perform_now
      end
    end
    
    # Active codes should remain
    assert_equal 5, OtpCode.active.count
  end

  private

  def capture_log
    original_logger = Rails.logger
    log_output = StringIO.new
    Rails.logger = Logger.new(log_output)
    
    yield
    
    log_output.string
  ensure
    Rails.logger = original_logger
  end
end
