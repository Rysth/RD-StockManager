require "active_support/core_ext/integer/time"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot for better performance and memory savings (ignored by Rake tasks).
  config.eager_load = true

  # Full error reports are disabled.
  config.consider_all_requests_local = false

  # Cache assets for far-future expiry since they are all digest stamped.
  config.public_file_server.headers = { "cache-control" => "public, max-age=#{1.year.to_i}" }

  # Explicitly allow current API host to avoid HostAuthorization 403s
  config.hosts << "api.example.com"

  # Enable serving of images, stylesheets, and JavaScripts from an asset server.
  # config.asset_host = "http://assets.example.com"

  # Store uploaded files on the local file system (see config/storage.yml for options).
  # config.active_storage.service = :local
  config.active_storage.service = :cloudflare

  # Assume all access to the app is happening through a SSL-terminating reverse proxy.
  config.assume_ssl = true

  # Force all access to the app over SSL, use Strict-Transport-Security, and use secure cookies.
  config.force_ssl = true

  # Configure SSL options with HSTS headers and security enhancements
  config.ssl_options = {
    # Skip http-to-https redirect for health check endpoints
    redirect: { exclude: ->(request) { request.path == "/up" } },
    # HSTS configuration - 1 year expiration with subdomain inclusion
    hsts: {
      expires: 1.year,
      subdomains: true,
      preload: true
    },
    # Additional security headers
    secure_cookies: true
  }

  # Additional security headers for API protection
  config.force_ssl_headers = {
    'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options' => 'nosniff',
    'X-Frame-Options' => 'DENY',
    'X-XSS-Protection' => '1; mode=block',
    'Referrer-Policy' => 'strict-origin-when-cross-origin'
  }

  # Log to STDOUT with the current request id as a default log tag.
  config.log_tags = [ :request_id ]
  config.logger   = ActiveSupport::TaggedLogging.logger(STDOUT)

  # Change to "debug" to log everything (including potentially personally-identifiable information!)
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Prevent health checks from clogging up the logs.
  config.silence_healthcheck_path = "/up"

  # Don't log any deprecations.
  config.active_support.report_deprecations = false

  # Replace the default in-process memory cache store with a durable alternative.
  config.cache_store = :redis_cache_store, { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/1") }

  # Replace the default in-process and non-durable queuing backend for Active Job.
  # config.active_job.queue_adapter = :resque

  # Email configuration for production
  
  # Enable email error reporting in production
  config.action_mailer.raise_delivery_errors = true
  config.action_mailer.perform_deliveries = true
  config.action_mailer.delivery_method = :smtp
  
  # Use admin frontend URLs for account-related links sent by mail.
  config.action_mailer.default_url_options = FrontendUrls.admin_mailer_url_options

  # Configure SMTP settings via environment (supports custom infra, not tied to Hostinger)
  # Required ENV: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, optionally SMTP_DOMAIN
  smtp_host = ENV.fetch("SMTP_HOST", "smtp.example.com")
  smtp_port = ENV.fetch("SMTP_PORT", 587).to_i
  smtp_domain = ENV.fetch("SMTP_DOMAIN", FrontendUrls.admin_uri.host)
  config.action_mailer.smtp_settings = {
    address: smtp_host,
    port: smtp_port,
    domain: smtp_domain,
    user_name: ENV.fetch("SMTP_USER"),
    password: ENV.fetch("SMTP_PASSWORD"),
    authentication: :plain,
    enable_starttls_auto: smtp_port != 465, # if 465 usually implicit TLS
    ssl: smtp_port == 465,
    tls: smtp_port == 465,
    open_timeout: 5,
    read_timeout: 5
  }

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = true

  # Do not dump schema after migrations.
  config.active_record.dump_schema_after_migration = false

  # Only use :id for inspections in production.
  config.active_record.attributes_for_inspect = [ :id ]

  # Ensure SECRET_KEY_BASE present early (Rails itself also checks). Raise a clearer hint if missing.
  if ENV["SECRET_KEY_BASE"].to_s.empty?
    warn "WARNING: SECRET_KEY_BASE is not set. Set it in Dokploy environment or credentials before booting production." \
      " Generate one with: rails secret"
  end
end
