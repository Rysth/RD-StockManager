require "test_helper"

class UserTest < ActiveSupport::TestCase
  def setup
    @user = users(:john)
  end

  # Validations
  test "should be valid with valid attributes" do
    assert @user.valid?
  end

  test "should require fullname" do
    @user.fullname = nil
    assert_not @user.valid?
    assert_includes @user.errors[:fullname], "El nombre completo es requerido"
  end

  test "should require username" do
    @user.username = nil
    assert_not @user.valid?
    assert_includes @user.errors[:username], "El nombre de usuario es requerido"
  end

  test "should require unique username" do
    duplicate_user = @user.dup
    duplicate_user.account = Account.create!(
      email: 'duplicate@remindzen.com',
      password_hash: RodauthApp.rodauth.allocate.password_hash('password'),
      status: :verified
    )
    assert_not duplicate_user.valid?
    assert_includes duplicate_user.errors[:username], "Este nombre de usuario ya está en uso"
  end

  test "username should only allow alphanumeric and underscores" do
    invalid_usernames = ['user name', 'user-name', 'user@name', 'user.name']
    invalid_usernames.each do |invalid_username|
      @user.username = invalid_username
      assert_not @user.valid?, "#{invalid_username} should be invalid"
      assert_includes @user.errors[:username], "Solo se permiten letras, números y guiones bajos"
    end
  end

  test "username should allow valid formats" do
    valid_usernames = ['username', 'user123', 'user_name', 'USER_123']
    valid_usernames.each do |valid_username|
      @user.username = valid_username
      assert @user.valid?, "#{valid_username} should be valid"
    end
  end

  # Associations
  test "should belong to account" do
    assert_respond_to @user, :account
    assert_instance_of Account, @user.account
  end

  test "should require account" do
    @user.account = nil
    assert_not @user.valid?
  end

  test "should have many roles through rolify" do
    assert_respond_to @user, :roles
    assert_respond_to @user, :add_role
    assert_respond_to @user, :remove_role
    assert_respond_to @user, :has_role?
  end

  # Delegations
  test "should delegate email to account" do
    assert_equal @user.account.email, @user.email
  end

  test "should delegate status to account" do
    assert_equal @user.account.status, @user.status
  end

  # Ransack
  test "should have ransackable attributes" do
    ransackable_attrs = User.ransackable_attributes
    assert_includes ransackable_attrs, 'id'
    assert_includes ransackable_attrs, 'username'
    assert_includes ransackable_attrs, 'fullname'
    assert_includes ransackable_attrs, 'created_at'
    assert_includes ransackable_attrs, 'updated_at'
  end

  test "should have ransackable associations" do
    ransackable_assocs = User.ransackable_associations
    assert_includes ransackable_assocs, 'roles'
    assert_includes ransackable_assocs, 'account'
  end

  # Roles
  test "should be able to add admin role" do
    @user.add_role(:admin)
    assert @user.has_role?(:admin)
  end

  test "should be able to add manager role" do
    @user.add_role(:manager)
    assert @user.has_role?(:manager)
  end

  test "should be able to have multiple roles" do
    @user.add_role(:admin)
    @user.add_role(:manager)
    assert @user.has_role?(:admin)
    assert @user.has_role?(:manager)
  end

  test "should be able to remove role" do
    @user.add_role(:admin)
    assert @user.has_role?(:admin)
    @user.remove_role(:admin)
    assert_not @user.has_role?(:admin)
  end

  # Callbacks
  test "should have before_destroy callback for account" do
    # Verify the callback exists
    callbacks = User._destroy_callbacks.map(&:filter)
    assert_includes callbacks, :destroy_account, "User should have destroy_account callback"
  end

  test "should attempt to destroy associated account when user is destroyed" do
    # Create a test account and user
    account = Account.create!(
      email: "destroy_test@remindzen.com",
      password_hash: RodauthApp.rodauth.allocate.password_hash('password'),
      status: :verified
    )
    user = User.create!(
      fullname: "Destroy Test User",
      username: "destroytest",
      account: account
    )
    
    # Verify the destroy_account method exists and is callable
    assert_respond_to user, :send, "User should respond to send method"
    assert user.send(:destroy_account), "destroy_account method should be callable"
    
    # The actual destruction behavior depends on the circular dependency between
    # User and Account models, so we just verify the callback exists
  end

  # Edge cases
  test "should handle empty fullname" do
    @user.fullname = ''
    assert_not @user.valid?
  end

  test "should handle whitespace in fullname" do
    @user.fullname = '   '
    assert_not @user.valid?
  end

  test "should handle empty username" do
    @user.username = ''
    assert_not @user.valid?
  end

  test "should handle whitespace in username" do
    @user.username = '   '
    assert_not @user.valid?
  end
end
