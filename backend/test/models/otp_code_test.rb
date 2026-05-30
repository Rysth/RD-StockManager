require "test_helper"

class OtpCodeTest < ActiveSupport::TestCase
  setup do
    @account = accounts(:verified_user)
  end

  # Test code generation (6 digits, SecureRandom)
  test "should generate 6-digit code on creation" do
    otp_code = OtpCode.create!(account: @account)
    
    assert_equal 6, otp_code.code.length
    assert otp_code.code.match?(/\A\d{6}\z/), "Code should be 6 digits"
    assert otp_code.code.to_i >= 100000, "Code should be at least 100000"
    assert otp_code.code.to_i <= 999999, "Code should be at most 999999"
  end

  test "should generate unique codes" do
    codes = []
    10.times do
      otp_code = OtpCode.create!(account: @account)
      codes << otp_code.code
      otp_code.destroy
    end
    
    # While not guaranteed, it's extremely unlikely to get duplicates
    assert_equal codes.uniq.length, codes.length, "Generated codes should be unique"
  end

  # Test expiration logic (5 minutes)
  test "should set expiration to 5 minutes from creation" do
    freeze_time = Time.current
    
    travel_to freeze_time do
      otp_code = OtpCode.create!(account: @account)
      expected_expiration = freeze_time + 5.minutes
      
      assert_in_delta expected_expiration.to_f, otp_code.expires_at.to_f, 1.0
    end
  end

  test "should identify expired codes correctly" do
    # Create code that expires in the past
    otp_code = OtpCode.create!(account: @account)
    otp_code.update!(expires_at: 1.minute.ago)
    
    assert otp_code.expired?, "Code should be expired"
    
    # Create code that expires in the future
    fresh_code = OtpCode.create!(account: @account)
    fresh_code.update!(expires_at: 1.minute.from_now)
    
    assert_not fresh_code.expired?, "Code should not be expired"
  end

  # Test used status tracking
  test "should track used status correctly" do
    otp_code = OtpCode.create!(account: @account)
    
    assert_not otp_code.used?, "New code should not be used"
    assert_nil otp_code.used_at, "used_at should be nil initially"
    
    otp_code.mark_as_used!
    
    assert otp_code.used?, "Code should be marked as used"
    assert_not_nil otp_code.used_at, "used_at should be set"
    assert_in_delta Time.current.to_f, otp_code.used_at.to_f, 1.0
  end

  test "should validate code correctly" do
    # Valid code (not expired, not used)
    valid_code = OtpCode.create!(account: @account)
    assert valid_code.valid_code?, "Fresh code should be valid"
    
    # Expired code
    expired_code = OtpCode.create!(account: @account)
    expired_code.update!(expires_at: 1.minute.ago)
    assert_not expired_code.valid_code?, "Expired code should not be valid"
    
    # Used code
    used_code = OtpCode.create!(account: @account)
    used_code.mark_as_used!
    assert_not used_code.valid_code?, "Used code should not be valid"
    
    # Both expired and used
    expired_used_code = OtpCode.create!(account: @account)
    expired_used_code.update!(expires_at: 1.minute.ago)
    expired_used_code.mark_as_used!
    assert_not expired_used_code.valid_code?, "Expired and used code should not be valid"
  end

  # Test active and expired scopes
  test "active scope should return only valid codes" do
    # Create active code
    active_code = OtpCode.create!(account: @account)
    
    # Create expired code
    expired_code = OtpCode.create!(account: accounts(:verified_user_two))
    expired_code.update!(expires_at: 1.minute.ago)
    
    # Create used code
    used_code = OtpCode.create!(account: accounts(:manager_account))
    used_code.mark_as_used!
    
    active_codes = OtpCode.active
    
    assert_includes active_codes, active_code
    assert_not_includes active_codes, expired_code
    assert_not_includes active_codes, used_code
  end

  test "expired scope should return only expired codes" do
    # Create active code
    active_code = OtpCode.create!(account: @account)
    
    # Create expired code
    expired_code = OtpCode.create!(account: accounts(:verified_user_two))
    expired_code.update!(expires_at: 1.minute.ago)
    
    expired_codes = OtpCode.expired
    
    assert_not_includes expired_codes, active_code
    assert_includes expired_codes, expired_code
  end

  # Test generate_for_account (invalidates old codes)
  test "generate_for_account should invalidate existing active codes" do
    # Create first code
    first_code = OtpCode.create!(account: @account)
    assert OtpCode.exists?(first_code.id), "First code should exist"
    
    # Generate new code for same account
    second_code = OtpCode.generate_for_account(@account)
    
    assert_not OtpCode.exists?(first_code.id), "First code should be destroyed"
    assert OtpCode.exists?(second_code.id), "Second code should exist"
    assert_equal @account, second_code.account
  end

  test "generate_for_account should not affect codes for other accounts" do
    other_account = accounts(:verified_user_two)
    
    # Create codes for both accounts
    first_account_code = OtpCode.create!(account: @account)
    other_account_code = OtpCode.create!(account: other_account)
    
    # Generate new code for first account
    new_code = OtpCode.generate_for_account(@account)
    
    assert_not OtpCode.exists?(first_account_code.id), "First account's old code should be destroyed"
    assert OtpCode.exists?(other_account_code.id), "Other account's code should remain"
    assert OtpCode.exists?(new_code.id), "New code should exist"
  end

  test "generate_for_account should only destroy active codes" do
    # Create and use a code
    old_used_code = OtpCode.create!(account: @account)
    old_used_code.mark_as_used!
    
    # Create an expired code
    old_expired_code = OtpCode.create!(account: @account)
    old_expired_code.update!(expires_at: 1.minute.ago)
    
    # Create an active code
    active_code = OtpCode.create!(account: @account)
    
    # Generate new code
    new_code = OtpCode.generate_for_account(@account)
    
    # Used and expired codes should remain (they're not active)
    assert OtpCode.exists?(old_used_code.id), "Used code should remain"
    assert OtpCode.exists?(old_expired_code.id), "Expired code should remain"
    
    # Active code should be destroyed
    assert_not OtpCode.exists?(active_code.id), "Active code should be destroyed"
    
    # New code should exist
    assert OtpCode.exists?(new_code.id), "New code should exist"
  end

  # Test validations
  test "should require account" do
    otp_code = OtpCode.new(code: "123456", expires_at: 5.minutes.from_now)
    assert_not otp_code.valid?
    assert_includes otp_code.errors[:account_id], "can't be blank"
  end

  test "should require code when set to nil after creation" do
    otp_code = OtpCode.create!(account: @account)
    otp_code.code = nil
    assert_not otp_code.valid?
    assert_includes otp_code.errors[:code], "can't be blank"
  end

  test "should require code to be exactly 6 characters when manually modified" do
    otp_code = OtpCode.create!(account: @account)
    
    # Too short
    otp_code.code = "12345"
    assert_not otp_code.valid?
    assert_includes otp_code.errors[:code], "is the wrong length (should be 6 characters)"
    
    # Too long  
    otp_code.code = "1234567"
    assert_not otp_code.valid?
    assert_includes otp_code.errors[:code], "is the wrong length (should be 6 characters)"
    
    # Just right
    otp_code.code = "123456"
    assert otp_code.valid?, "6-character code should be valid"
  end

  test "should require expires_at when set to nil after creation" do
    otp_code = OtpCode.create!(account: @account)
    otp_code.expires_at = nil
    assert_not otp_code.valid?
    assert_includes otp_code.errors[:expires_at], "can't be blank"
  end

  test "should belong to account" do
    otp_code = OtpCode.create!(account: @account)
    assert_equal @account, otp_code.account
    assert_includes @account.otp_codes, otp_code
  end
end
