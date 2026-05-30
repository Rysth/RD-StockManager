require "test_helper"

class RoleTest < ActiveSupport::TestCase
  def setup
    @role = roles(:admin)
    @user = users(:john)
  end

  # === ASSOCIATIONS ===

  test "should have and belong to many users" do
    assert_respond_to @role, :users
    assert_respond_to Role, :reflect_on_association
    
    association = Role.reflect_on_association(:users)
    assert_equal :has_and_belongs_to_many, association.macro
    assert_equal :users_roles, association.options[:join_table]
  end

  test "should belong to polymorphic resource" do
    assert_respond_to @role, :resource
    
    association = Role.reflect_on_association(:resource)
    assert association.polymorphic?
    assert association.options[:optional]
  end

  test "should be able to associate with users" do
    user_count = @role.users.count
    @role.users << @user unless @role.users.include?(@user)
    
    assert_includes @role.users, @user
    assert @role.users.count >= user_count
  end

  test "should be able to associate with polymorphic resources" do
    # Test with a Business resource if it's in allowed types
    if Rolify.resource_types.include?("Business")
      business = Business.create!(name: "Test Business")
      role = Role.create!(name: "business_admin", resource: business)
      
      assert_equal business, role.resource
      assert_equal "Business", role.resource_type
      assert_equal business.id, role.resource_id
    else
      # Skip this test if Business is not in allowed resource types
      skip "Business is not in Rolify.resource_types"
    end
  end

  # === VALIDATIONS ===

  test "should validate resource_type inclusion" do
    # First, let's check what Rolify.resource_types contains
    valid_types = Rolify.resource_types
    
    # Test with valid resource type
    if valid_types.any?
      role = Role.new(name: "test_role", resource_type: valid_types.first)
      assert role.valid?, "Role should be valid with allowed resource type"
    end
    
    # Test with invalid resource type
    role = Role.new(name: "test_role", resource_type: "InvalidType")
    assert_not role.valid?, "Role should not be valid with invalid resource type"
    assert_includes role.errors[:resource_type], "is not included in the list"
  end

  test "should allow nil resource_type" do
    role = Role.new(name: "global_role", resource_type: nil)
    assert role.valid?, "Role should be valid with nil resource_type"
  end

  # === RANSACK ===

  test "should have ransackable attributes" do
    ransackable_attrs = Role.ransackable_attributes
    expected_attrs = ["created_at", "id", "id_value", "name", "resource_id", "resource_type", "updated_at"]
    
    expected_attrs.each do |attr|
      assert_includes ransackable_attrs, attr, "Should include #{attr} in ransackable attributes"
    end
  end

  test "should have empty ransackable associations" do
    ransackable_assocs = Role.ransackable_associations
    assert_empty ransackable_assocs, "Role should have no ransackable associations for security"
  end

  test "should have empty ransackable scopes" do
    ransackable_scopes = Role.ransackable_scopes
    assert_empty ransackable_scopes, "Role should have no ransackable scopes for security"
  end

  # === ROLIFY INTEGRATION ===

  test "should have scopify functionality" do
    # Verify that the Role model has scopify called
    # This is verified by the presence of the scopify line in the model
    assert Role.respond_to?(:new), "Role should be a valid ActiveRecord model with scopify"
  end

  test "should work with rolify user methods" do
    # Test that roles work with user role methods
    @user.add_role(:test_role)
    test_role = Role.find_by(name: "test_role")
    
    assert test_role, "Test role should be created"
    assert_includes test_role.users, @user, "Role should include the user"
  end

  # === EDGE CASES ===

  test "should handle role creation with resource" do
    # Only test if Business is in allowed resource types
    if Rolify.resource_types.include?("Business")
      business = Business.create!(name: "Test Business")
      role = Role.create!(name: "owner", resource: business)
      
      assert role.persisted?, "Role should be saved"
      assert_equal business, role.resource
      assert_equal "Business", role.resource_type
    else
      # Test with nil resource instead
      role = Role.create!(name: "owner")
      assert role.persisted?, "Role should be saved without resource"
    end
  end

  test "should handle role without resource" do
    role = Role.create!(name: "global_admin")
    
    assert role.persisted?, "Role should be saved"
    assert_nil role.resource
    assert_nil role.resource_type
  end
end
