# frozen_string_literal: true

# Configure Rack::Attack for rate limiting and abuse prevention
class Rack::Attack
  # Configure Redis for distributed rate limiting (optional, falls back to memory)
  if Rails.env.production? && ENV['REDIS_URL']
    Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(url: ENV['REDIS_URL'])
  end

  # Enhanced logging for rate limit violations and security events
  ActiveSupport::Notifications.subscribe('rack.attack') do |name, start, finish, request_id, payload|
    req = payload[:request]
    match_type = req.env['rack.attack.match_type']
    matched_rule = req.env['rack.attack.matched']
    
    case match_type
    when :throttle
      Rails.logger.warn "[Rack::Attack][THROTTLE] IP: #{req.ip} | Rule: #{matched_rule} | Method: #{req.request_method} | Path: #{req.fullpath} | User-Agent: #{req.user_agent}"
      
      # Log additional security context for authentication attempts
      if matched_rule&.include?('auth') || matched_rule&.include?('login')
        email = req.params['email'] || req.params.dig('user', 'email') || req.params.dig('account', 'email')
        Rails.logger.error "[Rack::Attack][AUTH_ABUSE] Potential brute force attack - IP: #{req.ip} | Email: #{email} | Time: #{Time.current}"
      end
      
    when :blocklist
      Rails.logger.error "[Rack::Attack][BLOCKED] IP: #{req.ip} | Rule: #{matched_rule} | Method: #{req.request_method} | Path: #{req.fullpath}"
      
    when :track
      Rails.logger.info "[Rack::Attack][TRACKED] IP: #{req.ip} | Rule: #{matched_rule} | Method: #{req.request_method} | Path: #{req.fullpath}"
    end
  end

  # Custom response for rate limited requests
  self.throttled_responder = lambda do |req|
    match_data = req.env['rack.attack.match_data']
    now = match_data[:epoch_time]
    retry_after = match_data[:period] - (now % match_data[:period])
    
    [
      429, # Too Many Requests
      {
        'Content-Type' => 'application/json',
        'Retry-After' => retry_after.to_s,
        'X-RateLimit-Limit' => match_data[:limit].to_s,
        'X-RateLimit-Remaining' => '0',
        'X-RateLimit-Reset' => (now + retry_after).to_s
      },
      [{
        status: 'error',
        message: 'Rate limit exceeded. Please try again later.',
        retry_after: retry_after,
        limit: match_data[:limit],
        period: match_data[:period]
      }.to_json]
    ]
  end

  # General API rate limiting - 300 requests per 5 minutes per IP
  throttle('api/requests/ip', limit: 300, period: 5.minutes) do |req|
    req.ip if req.path.start_with?('/api/')
  end

  # Authentication rate limiting - 5 attempts per 20 seconds per email
  throttle('api/auth/email', limit: 5, period: 20.seconds) do |req|
    if req.path.match?(%r{/api/.*/auth}) || req.path.match?(%r{/api/.*/login}) || req.path.match?(%r{/api/.*/sign_in})
      # Extract email from request parameters
      email = req.params['email'] || req.params.dig('user', 'email') || req.params.dig('account', 'email')
      email&.downcase if email.present?
    end
  end

  # Sensitive operations rate limiting - stricter limits for user management
  throttle('api/sensitive/ip', limit: 60, period: 5.minutes) do |req|
    req.ip if req.path.match?(%r{/api/.*/users}) && %w[POST PUT PATCH DELETE].include?(req.request_method)
  end

  # Password reset rate limiting - prevent abuse of password reset functionality
  throttle('api/password_reset/email', limit: 3, period: 1.hour) do |req|
    if req.path.match?(%r{/api/.*/password}) && req.post?
      email = req.params['email'] || req.params.dig('user', 'email') || req.params.dig('account', 'email')
      email&.downcase if email.present?
    end
  end

  # Account creation rate limiting - prevent spam account creation
  throttle('api/signup/ip', limit: 10, period: 1.hour) do |req|
    req.ip if req.path.match?(%r{/api/.*/sign_up}) || (req.path.match?(%r{/api/.*/users}) && req.post?)
  end

  # Track suspicious activity patterns for monitoring
  track('api/suspicious/rapid_requests', limit: 100, period: 1.minute) do |req|
    req.ip if req.path.start_with?('/api/')
  end

  # Track failed authentication attempts for security monitoring
  track('api/failed_auth', limit: 10, period: 5.minutes) do |req|
    if req.path.match?(%r{/api/.*/auth}) || req.path.match?(%r{/api/.*/login}) || req.path.match?(%r{/api/.*/sign_in})
      # This will be tracked but not blocked, useful for monitoring
      req.ip
    end
  end

  # Blocklist for known bad actors (can be populated dynamically)
  blocklist('block_bad_ips') do |req|
    # Example: block specific IPs that have been identified as malicious
    # This can be populated from external threat intelligence or manual review
    blocked_ips = Rails.cache.fetch('rack_attack_blocked_ips', expires_in: 1.hour) { [] }
    blocked_ips.include?(req.ip)
  end
end

# Helper methods for rate limit management
class Rack::Attack
  # Method to check current rate limit status for an IP
  def self.rate_limit_status(ip, rule_name)
    cache_key = "#{rule_name}:#{ip}"
    count = cache.read(cache_key) || 0
    { current_count: count, cache_key: cache_key }
  end

  # Method to manually block an IP address
  def self.block_ip(ip, duration = 1.hour)
    blocked_ips = Rails.cache.fetch('rack_attack_blocked_ips', expires_in: 1.hour) { [] }
    blocked_ips << ip unless blocked_ips.include?(ip)
    Rails.cache.write('rack_attack_blocked_ips', blocked_ips, expires_in: duration)
    Rails.logger.warn "[Rack::Attack][MANUAL_BLOCK] IP #{ip} manually blocked for #{duration} seconds"
  end

  # Method to unblock an IP address
  def self.unblock_ip(ip)
    blocked_ips = Rails.cache.fetch('rack_attack_blocked_ips', expires_in: 1.hour) { [] }
    blocked_ips.delete(ip)
    Rails.cache.write('rack_attack_blocked_ips', blocked_ips, expires_in: 1.hour)
    Rails.logger.info "[Rack::Attack][MANUAL_UNBLOCK] IP #{ip} manually unblocked"
  end
end

# Insert Rack::Attack middleware in the proper position
# Place it after CORS but before other middleware for optimal security processing
Rails.application.config.middleware.insert_after Rack::Cors, Rack::Attack