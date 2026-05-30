# Main seeds file - loads environment-specific seeds
#
# Usage:
#   rails db:seed              - Runs seeds for current environment
#   RAILS_ENV=development rails db:seed
#
# For development, this loads db/seeds/development.rb
# For production, you may want to create db/seeds/production.rb with minimal data

env_seed_file = Rails.root.join("db", "seeds", "#{Rails.env}.rb")

if File.exist?(env_seed_file)
  puts "Loading #{Rails.env} seeds from #{env_seed_file}..."
  load(env_seed_file)
else
  puts "No environment-specific seed file found at #{env_seed_file}"
  puts "Skipping seeding. Create #{env_seed_file} if you need seed data."
end
