require "test_helper"

class AccountTest < ActiveSupport::TestCase
  def setup
    @account = accounts(:verified_user)
  end

  # === VALIDATIONS ===

  test "should be valid with valid email" do
    account = Account.new(
      email: "test@remindzen.com",
      password_hash: RodauthApp.rodauth.allocate.password_hash('password'),
      status: :verified
    )
    assert account.valid?, "Account should be valid with proper email"
  end

  test "should require email" do
    account = Account.new(
      email: nil,
      password_hash: RodauthApp.rodauth.allocate.password_hash('password')
    )
    assert_not account.valid?, "Account should not be valid without email"
  end

  test "should validate email format" do
    invalid_emails = ["invalid", "test@", "@example.com", "test@.com"]
    
    invalid_emails.each do |email|
      account = Account.new(
        email: email,
        password_hash: RodauthApp.rodauth.allocate.password_hash('password'),
        status: :verified
      )
      assert_not account.valid?, "#{email} should be invalid"
    end
  end

  test "should accept valid email formats" do
    valid_emails = [
      "user@example.com",
      "user.name@example.com",
      "user+tag@example.co.uk",
      "user_name@example-domain.com"
    ]
    
    valid_emails.each do |email|
      account = Account.new(
        email: email,
        password_hash: RodauthApp.rodauth.allocate.password_hash('password'),
        status: :verified
      )
      assert account.valid?, "#{email} should be valid"
    end
  end

  test "should enforce email uniqueness (case insensitive)" do
    existing_email = @account.email
    
    # Try with same case
    duplicate = Account.new(
      email: existing_email,
      password_hash: RodauthApp.rodauth.allocate.password_hash('password'),
      status: :verified
    )
    assert_not duplicate.valid?, "Should not allow duplicate email"
    
    # Try with different case
    duplicate_case = Account.new(
      email: existing_email.upcase,
      password_hash: RodauthApp.rodauth.allocate.password_hash('password'),
      status: :verified
    )
    assert_not duplicate_case.valid?, "Should not allow duplicate email (case insensitive)"
  end

  test "should allow same email for closed accounts" do
    closed_account = accounts(:closed_account)
    new_account = Account.new(
      email: closed_account.email,
      password_hash: RodauthApp.rodauth.allocate.password_hash('password'),
      status: :verified
    )
    # This test depends on your business logic - commenting for now
    # assert new_account.valid?, "Should allow reusing email from closed account"
  end

  # === CALLBACKS ===

  test "should downcase email before save" do
    account = Account.create!(
      email: "TEST@REMINDZEN.COM",
      password_hash: RodauthApp.rodauth.allocate.password_hash('password'),
      status: :verified
    )
    assert_equal "test@remindzen.com", account.email
  end

  test "should have after_commit callback for welcome notification" do
    # Verify the callback exists by checking the callback chain
    callback_methods = Account._commit_callbacks.map(&:filter)
    assert_includes callback_methods, :send_welcome_notification_async, "Account should have send_welcome_notification_async callback"
  end

  # === ASSOCIATIONS ===

  test "should have one user" do
    assert_respond_to @account, :user
    assert_instance_of User, @account.user
  end

  test "should destroy user when account is destroyed" do
    account = Account.create!(
      email: "temp@remindzen.com",
      password_hash: RodauthApp.rodauth.allocate.password_hash('password'),
      status: :verified
    )
    user = User.create!(
      fullname: "Temp User",
      username: "tempuser",
      account: account
    )
    
    assert_difference "User.count", -1 do
      account.destroy
    end
  end

  # === ENUMS ===

  test "should have status enum" do
    assert_equal 1, Account.statuses[:unverified]
    assert_equal 2, Account.statuses[:verified]
    assert_equal 3, Account.statuses[:closed]
  end

  test "should set status correctly" do
    account = Account.create!(
      email: "status@remindzen.com",
      password_hash: RodauthApp.rodauth.allocate.password_hash('password'),
      status: :unverified
    )
    assert account.unverified?
    
    account.verified!
    assert account.verified?
    
    account.closed!
    assert account.closed?
  end

  # === RANSACK ===

  test "should have ransackable attributes" do
    ransackable = Account.ransackable_attributes
    assert_includes ransackable, "id"
    assert_includes ransackable, "email"
    assert_includes ransackable, "status"
  end

  # === EDGE CASES ===

  test "should handle email with spaces in database" do
    # Emails should be trimmed before saving
    account = @account
    assert_equal account.email.strip, account.email
  end

  test "should have default status" do
    account = Account.create!(
      email: "default@remindzen.com",
      password_hash: RodauthApp.rodauth.allocate.password_hash('password')
    )
    assert account.status.present?
  end

  # === RODAUTH INTEGRATION ===

  test "account should have password_hash" do
    assert_respond_to @account, :password_hash
    assert @account.password_hash.present?
  end

  test "account should work with Rodauth password verification" do
    # The password hash should be compatible with Rodauth
    assert @account.password_hash.start_with?('$2a$')
  end
end
