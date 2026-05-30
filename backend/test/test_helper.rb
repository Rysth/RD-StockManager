ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"
require "faker"
require "bcrypt"
require "minitest/mock"

# Simple stub implementation for testing
class Object
  def stubs(method_name)
    StubProxy.new(self, method_name)
  end
end

class StubProxy
  def initialize(object, method_name)
    @object = object
    @method_name = method_name
  end
  
  def returns(value)
    @object.define_singleton_method(@method_name) { value }
  end
end

# Configure test environment
Rails.application.configure do
  # Disable logging during tests for cleaner output
  config.log_level = :warn
  
  # Use in-memory cache for faster tests
  config.cache_store = :memory_store
  
  # Disable request forgery protection in test environment
  config.action_controller.allow_forgery_protection = false
  
  # Disable action mailer delivery during tests
  config.action_mailer.perform_deliveries = false
  config.action_mailer.raise_delivery_errors = false
  
  # Use test adapter for Active Job
  config.active_job.queue_adapter = :test
end

# Set consistent locale for tests
I18n.locale = :en

# Configure Faker for consistent test data
Faker::Config.locale = :en
Faker::Config.random = Random.new(42) # Consistent seed for reproducible tests

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers (disabled for Docker consistency)
    # parallelize(workers: :number_of_processors)
    
    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Use database transactions for test isolation
    self.use_transactional_tests = true
    
    # Configure test database isolation and cleanup
    self.use_instantiated_fixtures = false
    
    # Ensure database cleanup between tests
    setup do
      # Ensure database connection is active
      ActiveRecord::Base.connection.verify!
      
      # Reset any cached data
      Rails.cache.clear if Rails.cache.respond_to?(:clear)
      
      # Clear Active Job test queue
      if Rails.env.test?
        ActiveJob::Base.queue_adapter.enqueued_jobs.clear
        ActiveJob::Base.queue_adapter.performed_jobs.clear
      end
      
      # Reset any global state
      Current.reset if defined?(Current)
      
      # Reset database sequences for consistent test IDs
      reset_database_sequences if respond_to?(:reset_database_sequences, true)
    end

    teardown do
      # Clean up any test artifacts
      Rails.cache.clear if Rails.cache.respond_to?(:clear)
      
      # Clear Active Job test queue
      if Rails.env.test?
        ActiveJob::Base.queue_adapter.enqueued_jobs.clear
        ActiveJob::Base.queue_adapter.performed_jobs.clear
      end
      
      # Reset any global state
      Current.reset if defined?(Current)
      
      # Ensure database connection is clean
      ActiveRecord::Base.connection.rollback_db_transaction if ActiveRecord::Base.connection.transaction_open?
    end
    
    private
    
    # Reset database sequences for consistent test IDs
    def reset_database_sequences
      return unless Rails.env.test?
      
      # Only reset sequences if we're not in a transaction
      unless ActiveRecord::Base.connection.transaction_open?
        ActiveRecord::Base.connection.tables.each do |table|
          begin
            ActiveRecord::Base.connection.reset_pk_sequence!(table)
          rescue => e
            # Ignore errors for tables without sequences
          end
        end
      end
    end

    # Helper method to parse JSON responses
    def json_response
      return nil unless defined?(response) && response&.body&.present?
      JSON.parse(response.body)
    rescue => e
      nil
    end

    # Helper method to create authenticated user for testing
    def create_authenticated_user(role: nil, attributes: {})
      # Generate unique email and username with timestamp for uniqueness
      timestamp = Time.current.to_f.to_s.gsub('.', '')
      email = attributes[:email] || "test_#{timestamp}@example.com"
      username = attributes[:username] || "user_#{timestamp}"
      
      # Use Rodauth's password hashing for consistency
      password_hash = if defined?(RodauthApp)
        RodauthApp.rodauth.allocate.password_hash('password123')
      else
        BCrypt::Password.create('password123', cost: 4)
      end
      
      account = Account.create!(
        email: email,
        status: :verified,
        password_hash: password_hash
      )
      
      user_attributes = {
        account: account,
        username: username,
        fullname: attributes[:fullname] || Faker::Name.name,
        phone_number: attributes[:phone_number] || "+1#{Faker::Number.number(digits: 10)}",
        identification: attributes[:identification] || Faker::Number.number(digits: 10).to_s
      }
      
      user = User.create!(user_attributes)
      
      # Assign role if specified
      case role
      when :admin
        user.add_role(:admin)
      when :manager
        user.add_role(:manager)
      when :user
        user.add_role(:user)
      end
      
      user
    end

    # Helper method to create test business
    def create_test_business(attributes = {})
      timestamp = Time.current.to_f.to_s.gsub('.', '')
      default_attributes = {
        name: attributes[:name] || "Test Business #{timestamp}",
        slogan: 'Test slogan',
        whatsapp: '+1234567890',
        instagram: "test_instagram_#{timestamp}",
        facebook: "test.facebook.#{timestamp}",
        tiktok: "test_tiktok_#{timestamp}"
      }
      
      Business.create!(default_attributes.merge(attributes))
    end
    
    # Helper method to assert model validations
    def assert_validation_error(model, attribute, message_key = nil)
      assert_not model.valid?, "Expected #{model.class} to be invalid"
      assert model.errors[attribute].any?, "Expected errors on #{attribute}"
      if message_key
        assert model.errors[attribute].include?(I18n.t("errors.messages.#{message_key}")), 
               "Expected error message for #{message_key}"
      end
    end
    
    # Helper method to assert successful model creation
    def assert_model_created(model_class, attributes = {})
      assert_difference "#{model_class}.count", 1 do
        yield if block_given?
      end
    end
  end
end

# Controller test helpers
module ActionController
  class TestCase
    setup do
      # Ensure request object is available for authentication mocking
      @request ||= ActionController::TestRequest.create(self.class.controller_class)
    end
    
    # Helper to simulate user authentication in controller tests
    def login_as(user)
      # Create a comprehensive mock rodauth object
      rodauth_mock = RodauthTestMock.new(user)
      
      # Store current user for helper access
      @current_test_user = user
      @current_rodauth_mock = rodauth_mock
      
      # Set up the request environment for controller tests
      @request.env['rodauth'] = rodauth_mock
    end

    # Helper to simulate logout
    def logout
      # Create a mock rodauth object for unauthenticated state
      rodauth_mock = RodauthTestMock.new(nil)
      
      # Clear current user
      @current_test_user = nil
      @current_rodauth_mock = rodauth_mock
      
      # Set up the request environment for controller tests
      @request.env['rodauth'] = rodauth_mock
    end
    
    # Helper to get current test user
    def current_test_user
      @current_test_user
    end
  end
end

module ActionDispatch
  class IntegrationTest
    include ActiveSupport::Testing::Assertions

    # Helper method to parse JSON responses
    def json_response
      return nil unless defined?(response) && response&.body&.present?
      JSON.parse(response.body)
    rescue => e
      nil
    end

    # Helper to simulate user authentication in controller tests
    def login_as(user)
      # Create a comprehensive mock rodauth object
      rodauth_mock = RodauthTestMock.new(user)
      
      # Store current user for helper access
      @current_test_user = user
      @current_rodauth_mock = rodauth_mock
      
      # Set up the request environment for controller tests
      if defined?(@request) && @request
        @request.env['rodauth'] = rodauth_mock
      end
    end

    # Helper to simulate logout
    def logout
      # Create a mock rodauth object for unauthenticated state
      rodauth_mock = RodauthTestMock.new(nil)
      
      # Clear current user
      @current_test_user = nil
      @current_rodauth_mock = rodauth_mock
      
      # Set up the request environment for controller tests
      if defined?(@request) && @request
        @request.env['rodauth'] = rodauth_mock
      end
    end
    
    # Helper to get current test user
    def current_test_user
      @current_test_user
    end

    # Helper for API request headers
    def api_headers(content_type: 'application/json')
      {
        'Content-Type' => content_type,
        'Accept' => 'application/json'
      }
    end

    # Helper to make authenticated API requests
    def authenticated_request(method, path, user:, params: {}, headers: {})
      # Set up authentication before making the request
      login_as(user)
      
      # Store the current rodauth mock in a thread-local variable
      Thread.current[:test_rodauth_mock] = @current_rodauth_mock
      
      # For integration tests, we need to handle the request differently
      case method.to_sym
      when :get
        get path, params: params, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock }
      when :post
        post path, params: params.to_json, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock }
      when :put
        put path, params: params.to_json, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock }
      when :patch
        patch path, params: params.to_json, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock }
      when :delete
        delete path, params: params, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock }
      else
        send(method, path, params: params, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock })
      end
    ensure
      # Clean up the thread-local variable
      Thread.current[:test_rodauth_mock] = nil
    end
    
    # Helper to make unauthenticated API requests
    def unauthenticated_request(method, path, params: {}, headers: {})
      logout
      
      case method.to_sym
      when :get
        get path, params: params, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock }
      when :post
        post path, params: params.to_json, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock }
      when :put
        put path, params: params.to_json, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock }
      when :patch
        patch path, params: params.to_json, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock }
      when :delete
        delete path, params: params, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock }
      else
        send(method, path, params: params, headers: api_headers.merge(headers), env: { 'rodauth' => @current_rodauth_mock })
      end
    end

    # Helper to assert JSON response structure
    def assert_json_response(expected_keys = [])
      assert_equal 'application/json; charset=utf-8', response.content_type
      json = json_response
      expected_keys.each do |key|
        assert json.key?(key.to_s), "Expected JSON response to include key: #{key}"
      end
      json
    end

    # Helper to assert successful API response
    def assert_api_success(message: nil)
      json = assert_json_response(['status'])
      assert_equal 'success', json['status']
      assert_equal message, json['message'] if message
      json
    end

    # Helper to assert API error response
    def assert_api_error(status_code: :unprocessable_entity, message: nil)
      assert_response status_code
      json = assert_json_response(['status'])
      assert_equal 'error', json['status']
      assert_equal message, json['message'] if message
      json
    end
    
    # Helper to assert unauthorized response
    def assert_unauthorized
      assert_response :unauthorized
      json = json_response
      assert_equal 'error', json['status'] if json && json['status']
    end
    
    # Helper to assert forbidden response
    def assert_forbidden
      assert_response :forbidden
      json = json_response
      assert_equal 'error', json['status'] if json && json['status']
    end
    
    # Helper to assert not found response
    def assert_not_found
      assert_response :not_found
      json = json_response
      assert_equal 'error', json['status'] if json && json['status']
    end
  end
end
# Comprehensive Rodauth mock for testing
class RodauthTestMock
  attr_reader :account, :user
  
  def initialize(user = nil)
    @user = user
    @account = user&.account
  end
  
  def authenticated?
    !@account.nil?
  end
  
  def logged_in?
    authenticated?
  end
  
  def rails_account
    @account
  end
  
  def account_id
    @account&.id
  end
  
  def session_value
    @account&.id
  end
  
  def require_authentication
    return true if authenticated?
    raise StandardError, "Authentication required"
  end
  
  # Additional methods that might be called by controllers
  def account_from_session
    @account
  end
  
  def current_account
    @account
  end
  
  def login_required?
    !authenticated?
  end
  
  def valid_login_session?
    authenticated?
  end
end

# Load test support files
Dir[Rails.root.join('test', 'support', '**', '*.rb')].sort.each { |f| require f }

# Test configuration and utilities
module TestConfiguration
  # Ensure test database is properly set up
  def self.setup_test_database
    return unless Rails.env.test?
    
    begin
      # Ensure database exists and is migrated
      ActiveRecord::Base.connection.execute("SELECT 1")
    rescue ActiveRecord::NoDatabaseError
      Rails.application.load_tasks
      Rake::Task["db:create"].invoke
      Rake::Task["db:migrate"].invoke
    rescue ActiveRecord::PendingMigrationError
      Rails.application.load_tasks
      Rake::Task["db:migrate"].invoke
    end
  end
  
  # Reset database sequences for consistent test IDs
  def self.reset_sequences
    return unless Rails.env.test?
    
    ActiveRecord::Base.connection.tables.each do |table|
      begin
        ActiveRecord::Base.connection.reset_pk_sequence!(table)
      rescue => e
        # Ignore errors for tables without sequences
      end
    end
  end
  
  # Configure test database for optimal performance and isolation
  def self.configure_test_database
    return unless Rails.env.test?
    
    # Set database configuration for faster tests
    ActiveRecord::Base.connection.execute("SET synchronous_commit = OFF") rescue nil
    ActiveRecord::Base.connection.execute("SET checkpoint_segments = 32") rescue nil
    ActiveRecord::Base.connection.execute("SET checkpoint_completion_target = 0.9") rescue nil
    ActiveRecord::Base.connection.execute("SET wal_buffers = '16MB'") rescue nil
    ActiveRecord::Base.connection.execute("SET shared_buffers = '256MB'") rescue nil
    
    # Ensure proper isolation level
    ActiveRecord::Base.connection.execute("SET default_transaction_isolation = 'read committed'") rescue nil
  end
  
  # Clean up test database artifacts
  def self.cleanup_test_database
    return unless Rails.env.test?
    
    # Clear any temporary data
    begin
      ActiveRecord::Base.connection.execute("TRUNCATE TABLE active_storage_blobs, active_storage_attachments RESTART IDENTITY CASCADE") rescue nil
    rescue => e
      # Ignore if tables don't exist
    end
  end
end

# Patch ApplicationController for testing
if Rails.env.test?
  ApplicationController.class_eval do
    prepend_before_action :setup_test_rodauth
    
    private
    
    def setup_test_rodauth
      if Thread.current[:test_rodauth_mock]
        request.env['rodauth'] = Thread.current[:test_rodauth_mock]
      end
    end
  end
end

# Initialize test database on load
TestConfiguration.setup_test_database
TestConfiguration.configure_test_database

# Include test helpers in test classes
ActiveSupport::TestCase.include AuthenticationHelpers
ActiveSupport::TestCase.include FactoryHelpers
ActionDispatch::IntegrationTest.include AuthenticationHelpers
ActionDispatch::IntegrationTest.include FactoryHelpers
ActionController::TestCase.include AuthenticationHelpers if defined?(ActionController::TestCase)
ActionController::TestCase.include FactoryHelpers if defined?(ActionController::TestCase)