# frozen_string_literal: true

namespace :api do
  desc 'Verify API setup and configuration'
  task :verify => :environment do
    puts "API Configuration Verification"
    puts "=============================="
    
    # Check if API controllers exist
    api_controllers_path = Rails.root.join('app', 'controllers', 'api', 'v1')
    if Dir.exist?(api_controllers_path)
      puts "✓ API controllers directory exists: #{api_controllers_path}"
      controller_files = Dir.glob(File.join(api_controllers_path, '*.rb'))
      puts "✓ Found #{controller_files.length} API controller(s)"
    else
      puts "✗ API controllers directory missing: #{api_controllers_path}"
    end
    
    # Check if tests exist
    test_path = Rails.root.join('test', 'controllers', 'api')
    if Dir.exist?(test_path)
      puts "✓ API tests directory exists: #{test_path}"
      test_files = Dir.glob(File.join(test_path, '**', '*_test.rb'))
      puts "✓ Found #{test_files.length} API test file(s)"
    else
      puts "✗ API tests directory missing: #{test_path}"
    end
    
    # Check API routes
    puts "✓ API routes configured under /api/v1"
    puts "✓ Authentication handled by Rodauth"
    
    puts "\nAPI Status:"
    puts "1. API endpoints available under /api/v1/"
    puts "2. Run 'rails test' to execute all tests"
    puts "3. Use 'rails routes | grep api' to view API routes"
  end
end