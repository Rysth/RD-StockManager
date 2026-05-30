module FrontendUrls
  module_function

  def admin_url
    ENV["ADMIN_FRONTEND_URL"].presence || ENV["FRONTEND_URL"].presence || "http://localhost:5173"
  end

  def storefront_url
    ENV["STOREFRONT_FRONTEND_URL"].presence || ENV["STOREFRONT_URL"].presence || "http://localhost:4321"
  end

  def admin_uri
    URI.parse(admin_url)
  end

  def storefront_uri
    URI.parse(storefront_url)
  end

  def admin_allowed_origins
    parse_origins(ENV["ADMIN_ALLOWED_ORIGINS"], admin_url)
  end

  def storefront_allowed_origins
    parse_origins(ENV["STOREFRONT_ALLOWED_ORIGINS"], storefront_url)
  end

  def allowed_origins
    (
      admin_allowed_origins +
      storefront_allowed_origins +
      parse_origins(ENV["ALLOWED_ORIGINS"])
    ).uniq
  end

  def admin_mailer_url_options
    url_options(admin_uri)
  end

  def url_options(uri)
    options = {
      host: uri.host,
      protocol: uri.scheme,
    }

    options[:port] = uri.port if uri.port && !default_port?(uri)
    options
  end

  def default_port?(uri)
    (uri.scheme == "http" && uri.port == 80) || (uri.scheme == "https" && uri.port == 443)
  end

  def parse_origins(value, *fallbacks)
    [value, *fallbacks]
      .compact
      .flat_map { |entry| entry.split(/[\s,]+/) }
      .map(&:strip)
      .reject(&:empty?)
      .uniq
  end
end