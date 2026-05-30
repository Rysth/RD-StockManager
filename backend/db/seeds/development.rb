# Development Seeds - Run ONLY in development environment
# This file creates test data for local development

unless Rails.env.development?
  puts "⚠️  This seed file is only for development environment!"
  puts "Current environment: #{Rails.env}"
  exit 1
end

puts "🌱 Seeding development database..."

# Clear existing data
puts "Clearing existing data..."
User.destroy_all
Account.destroy_all
Role.destroy_all

# Create default roles
puts "Creating roles..."
admin_role = Role.create!(name: 'admin')
manager_role = Role.create!(name: 'manager') 
operator_role = Role.create!(name: 'operator')
user_role = Role.create!(name: 'user')

# Create permissions and assign to roles
puts "Creating permissions..."
Permission.seed!

# Use BCrypt directly to hash passwords (same as Rodauth uses)
require 'bcrypt'
password_hash = BCrypt::Password.create("password123", cost: 12)

# Create 1 verified admin account with user
puts "Creating admin account..."
admin_account = Account.create!(
  email: "admin@example.com",
  password_hash: password_hash,
  status: 2 # verified status
)

admin_user = User.create!(
  account: admin_account,
  fullname: "System Administrator",
  username: "admin"
)
admin_user.add_role(:admin)

# Create 1 verified manager
puts "Creating manager account..."
manager_account = Account.create!(
  email: "manager@example.com", 
  password_hash: password_hash,
  status: 2
)

manager_user = User.create!(
  account: manager_account,
  fullname: "System Manager",
  username: "manager"
)
manager_user.add_role(:manager)

# Create 1 verified operator
puts "Creating operator account..."
operator_account = Account.create!(
  email: "operator@example.com",
  password_hash: password_hash, 
  status: 2
)

operator_user = User.create!(
  account: operator_account,
  fullname: "System Operator", 
  username: "operator"
)
operator_user.add_role(:operator)

# Create 20 unverified regular users
puts "Creating 20 regular users..."
20.times do |i|
  account = Account.create!(
    email: "user#{i + 1}@example.com",
    password_hash: password_hash,
    status: 1 # unverified status
  )
  
  user = User.create!(
    account: account,
    fullname: "User #{i + 1}",
    username: "user#{i + 1}"
  )
  user.add_role(:user)
end

puts ""
puts "=" * 60
puts "✅ Development database seeded successfully!"
puts "=" * 60
puts ""
puts "📋 Created roles: #{Role.pluck(:name).join(', ')}"
puts "🔐 Created permissions: #{Permission.count} (#{Permission.pluck(:key).join(', ')})"
puts ""
puts "👥 Created 23 accounts with associated users:"
puts "   • 1 verified admin: admin@example.com (admin role)"
puts "   • 1 verified manager: manager@example.com (manager role)"  
puts "   • 1 verified operator: operator@example.com (operator role)"
puts "   • 20 unverified users: user1@example.com through user20@example.com (user role)"
puts ""
puts "🔑 All accounts have password: password123"
puts "=" * 60
