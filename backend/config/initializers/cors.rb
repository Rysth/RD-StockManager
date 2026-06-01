# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  lan_origin_patterns = if Rails.env.development?
    [
      %r{\Ahttps?://localhost:\d+\z},
      %r{\Ahttps?://127\.0\.0\.1:\d+\z},
      %r{\Ahttps?://10\.\d+\.\d+\.\d+:\d+\z},
      %r{\Ahttps?://192\.168\.\d+\.\d+:\d+\z},
      %r{\Ahttps?://172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+\z}
    ]
  else
    []
  end

  allowed_origins = FrontendUrls.allowed_origins + lan_origin_patterns

  # Web client configuration - more restrictive for security
  allow do
    origins(*allowed_origins)

    # Specific resource configuration for API v1 endpoints
    resource '/api/v1/*',
      headers: %w[Authorization Content-Type Accept X-Requested-With],
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      expose: ['Authorization', 'Content-Disposition', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
  end

  # Legacy API endpoints (for backward compatibility during transition)
  allow do
    origins(*allowed_origins)

    resource '/api/*',
      headers: %w[Authorization Content-Type Accept X-Requested-With],
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      expose: ['Authorization', 'Content-Disposition']
  end

  # Public endpoints (less restrictive but still controlled)
  allow do
    origins(*allowed_origins)

    resource '/api/v1/public/*',
      headers: %w[Content-Type Accept X-Requested-With],
      methods: [:get, :options, :head],
      credentials: false,
      expose: ['X-RateLimit-Limit', 'X-RateLimit-Remaining']
  end

  # Development-only configuration
  if Rails.env.development?
    allow do
      origins 'http://localhost:5174'

      resource '/api/v1/*',
        headers: %w[Authorization Content-Type Accept X-Requested-With],
        methods: [:get, :post, :put, :patch, :delete, :options, :head],
        credentials: false,  # Desktop apps use token auth
        expose: ['Authorization', 'Content-Disposition', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
    end
  end
end
