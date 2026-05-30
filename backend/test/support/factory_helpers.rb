# frozen_string_literal: true

module FactoryHelpers
  # Create account with specific attributes
  def build_account(attributes = {})
    timestamp = Time.current.to_f.to_s.gsub('.', '')
    password_hash = if defined?(RodauthApp)
      RodauthApp.rodauth.allocate.password_hash('password123')
    else
      BCrypt::Password.create('password123', cost: 4)
    end

    default_attributes = {
      email: "test_#{timestamp}@example.com",
      status: :verified,
      password_hash: password_hash
    }

    Account.new(default_attributes.merge(attributes))
  end

  def create_account(attributes = {})
    build_account(attributes).tap(&:save!)
  end

  # Create user with specific attributes and account association
  def build_user(attributes = {})
    timestamp = Time.current.to_f.to_s.gsub('.', '')
    account = attributes.delete(:account) || create_account

    default_attributes = {
      account: account,
      username: "user_#{timestamp}",
      fullname: Faker::Name.name,
      phone_number: "+1#{Faker::Number.number(digits: 10)}",
      identification: Faker::Number.number(digits: 10).to_s
    }

    User.new(default_attributes.merge(attributes))
  end

  def create_user(attributes = {})
    build_user(attributes).tap(&:save!)
  end

  # Create user with account association and specific role
  def create_user_with_account_and_role(role, user_attributes = {}, account_attributes = {})
    account = create_account(account_attributes)
    user = create_user(user_attributes.merge(account: account))
    assign_role_to_user(user, role)
    user
  end

  # Create admin user with full setup
  def create_admin_user_with_account(user_attributes = {}, account_attributes = {})
    create_user_with_account_and_role(:admin, user_attributes, account_attributes)
  end

  # Create manager user with full setup
  def create_manager_user_with_account(user_attributes = {}, account_attributes = {})
    create_user_with_account_and_role(:manager, user_attributes, account_attributes)
  end

  # Create regular user with full setup
  def create_regular_user_with_account(user_attributes = {}, account_attributes = {})
    create_user_with_account_and_role(:user, user_attributes, account_attributes)
  end

  # Create business with specific attributes and various configurations
  def build_business(attributes = {})
    timestamp = Time.current.to_f.to_s.gsub('.', '')
    
    default_attributes = {
      name: "Test Business #{timestamp}",
      slogan: 'Test slogan',
      whatsapp: '+1234567890',
      instagram: "test_instagram_#{timestamp}",
      facebook: "test.facebook.#{timestamp}",
      tiktok: "test_tiktok_#{timestamp}"
    }

    Business.new(default_attributes.merge(attributes))
  end

  def create_business(attributes = {})
    build_business(attributes).tap(&:save!)
  end

  # Create business with complete social media configuration
  def create_business_with_social_media(attributes = {})
    timestamp = Time.current.to_f.to_s.gsub('.', '')
    
    social_media_attributes = {
      whatsapp: "+1#{Faker::Number.number(digits: 10)}",
      instagram: "business_#{timestamp}",
      facebook: "business.page.#{timestamp}",
      tiktok: "business_tiktok_#{timestamp}",
      email: "business_#{timestamp}@example.com",
      phone: "+1#{Faker::Number.number(digits: 10)}"
    }
    
    create_business(social_media_attributes.merge(attributes))
  end

  # Create business with minimal configuration
  def create_minimal_business(attributes = {})
    timestamp = Time.current.to_f.to_s.gsub('.', '')
    
    minimal_attributes = {
      name: "Minimal Business #{timestamp}"
    }
    
    create_business(minimal_attributes.merge(attributes))
  end

  # Create role with specific attributes
  def build_role(attributes = {})
    default_attributes = {
      name: 'test_role'
    }

    Role.new(default_attributes.merge(attributes))
  end

  def create_role(attributes = {})
    build_role(attributes).tap(&:save!)
  end

  # Role assignment helper methods
  def assign_role_to_user(user, role_name)
    # Ensure the role exists
    role = Role.find_or_create_by(name: role_name.to_s)
    
    # Assign role to user using Rolify
    user.add_role(role_name) unless user.has_role?(role_name)
    user
  end

  def remove_role_from_user(user, role_name)
    user.remove_role(role_name) if user.has_role?(role_name)
    user
  end

  def assign_multiple_roles_to_user(user, role_names)
    role_names.each { |role_name| assign_role_to_user(user, role_name) }
    user
  end

  # Create user with multiple roles
  def create_user_with_multiple_roles(role_names, user_attributes = {})
    user = create_user(user_attributes)
    assign_multiple_roles_to_user(user, role_names)
    user
  end

  # Create role with resource association
  def create_role_with_resource(role_name, resource)
    Role.create!(name: role_name.to_s, resource: resource)
  end

  # Create multiple records with factory pattern
  def create_multiple(model_class, count, attributes = {})
    count.times.map do |i|
      case model_class.to_s
      when 'User'
        create_user(attributes.merge(username: "user_#{i}_#{Time.current.to_f}"))
      when 'Account'
        create_account(attributes.merge(email: "test_#{i}_#{Time.current.to_f}@example.com"))
      when 'Business'
        create_business(attributes.merge(name: "Business #{i} #{Time.current.to_f}"))
      when 'Role'
        create_role(attributes.merge(name: "role_#{i}_#{Time.current.to_f}"))
      else
        raise ArgumentError, "Unknown model class: #{model_class}"
      end
    end
  end

  # Create test data sets for complex scenarios
  def create_user_hierarchy
    admin = create_admin_user_with_account(
      { fullname: 'Admin User', username: 'admin_test' },
      { email: 'admin@test.com' }
    )
    
    manager = create_manager_user_with_account(
      { fullname: 'Manager User', username: 'manager_test' },
      { email: 'manager@test.com' }
    )
    
    user = create_regular_user_with_account(
      { fullname: 'Regular User', username: 'user_test' },
      { email: 'user@test.com' }
    )
    
    { admin: admin, manager: manager, user: user }
  end

  # Create complete business setup with users
  def create_business_with_users
    business = create_business_with_social_media
    users = create_user_hierarchy
    
    { business: business, users: users }
  end

  # Create test scenario with specific data patterns
  def create_test_scenario(scenario_name)
    case scenario_name.to_sym
    when :basic_auth
      create_user_hierarchy
    when :business_management
      create_business_with_users
    when :role_testing
      {
        admin_role: create_role(name: 'admin'),
        manager_role: create_role(name: 'manager'),
        user_role: create_role(name: 'user'),
        custom_role: create_role(name: 'custom_role')
      }
    when :validation_testing
      {
        valid_user: build_user,
        invalid_user: build_user(username: ''),
        valid_business: build_business,
        invalid_business: build_business(name: ''),
        valid_account: build_account,
        invalid_account: build_account(email: 'invalid-email')
      }
    else
      raise ArgumentError, "Unknown test scenario: #{scenario_name}"
    end
  end

  # Cleanup helper for test isolation
  def cleanup_test_data
    User.destroy_all
    Account.destroy_all
    Business.destroy_all
    Role.destroy_all
  end

  # Batch creation helpers
  def create_users_batch(count, base_attributes = {})
    create_multiple('User', count, base_attributes)
  end

  def create_accounts_batch(count, base_attributes = {})
    create_multiple('Account', count, base_attributes)
  end

  def create_businesses_batch(count, base_attributes = {})
    create_multiple('Business', count, base_attributes)
  end
end