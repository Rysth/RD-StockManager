# Production Seeds — generic, per-client deploy
# Runs automatically on deploy via db:seed, or manually with:
#   bin/rails db:seed RAILS_ENV=production
#
# Creates only the minimum required data: roles, permissions, a default location,
# and the initial admin user. Business identity is set via BUSINESS_* env vars at
# startup — no hardcode here.

unless Rails.env.production?
  puts "⚠️  This seed file is only for production environment!"
  puts "Current environment: #{Rails.env}"
  exit 1
end

puts "🌱 Seeding production database..."

# Roles
puts "Creating roles..."
Role.find_or_create_by!(name: 'admin')
Role.find_or_create_by!(name: 'business_owner')
Role.find_or_create_by!(name: 'business_employee')

# Permissions
puts "Seeding permissions..."
Permission.seed!

# Default location
puts "Creating default location..."
Location.find_or_create_by!(name: "Principal") do |loc|
  loc.is_default = true
  loc.active     = true
end

# Admin user — credentials come from env vars
admin_email    = ENV.fetch("ADMIN_EMAIL")
admin_password = ENV["ADMIN_PASSWORD"].presence || SecureRandom.hex(12)

if Account.exists?(email: admin_email)
  puts "ℹ️  Admin account already exists (#{admin_email}), skipping."
else
  require "bcrypt"
  password_hash = BCrypt::Password.create(admin_password, cost: 12)
  account = Account.create!(email: admin_email, password_hash: password_hash, status: 2)
  user    = User.create!(account: account, fullname: "Administrador", username: "admin")
  user.add_role(:admin)

  puts ""
  puts "=" * 60
  puts "✅ Admin user created!"
  puts "   Email:    #{admin_email}"
  if ENV["ADMIN_PASSWORD"].blank?
    puts "   Password: #{admin_password}  ← SAVE THIS NOW"
    File.write(Rails.root.join("tmp", "initial_admin.txt"), "email: #{admin_email}\npassword: #{admin_password}\n")
    puts "   (also saved to tmp/initial_admin.txt)"
  else
    puts "   Password: [from ADMIN_PASSWORD env var]"
  end
  puts "=" * 60
end

puts ""
puts "✅ Production seed complete."
puts "   Roles:       #{Role.count}"
puts "   Permissions: #{Permission.count}"
puts "   Locations:   #{Location.count}"
puts "   Users:       #{User.count}"
