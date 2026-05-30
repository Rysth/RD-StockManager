# frozen_string_literal: true

# Many managed Redis providers generate passwords with reserved URI characters
# like '@', ':' or '/'. Sidekiq (and other Redis clients) use URI parsing and
# will crash if these characters are not percent-encoded in the userinfo.
#
# This initializer sanitizes ENV['REDIS_URL'] in-place so all consumers
# (Sidekiq, ActionCable, cache_store, Rack::Attack, etc.) can connect.

require 'uri'

module RedisUrl
  module_function

  UNRESERVED = /[A-Za-z0-9\-._~]/.freeze

  def percent_encode_userinfo(part)
    return '' if part.nil?

    part.bytes.map do |byte|
      char = byte.chr
      if char.match?(UNRESERVED)
        char
      else
        format('%%%02X', byte)
      end
    end.join
  end

  def sanitize(url)
    return url if url.nil? || url.strip.empty?

    # If it already parses, keep it.
    URI.parse(url)
    url
  rescue URI::InvalidURIError
    scheme_sep = url.index('://')
    return url unless scheme_sep

    scheme = url[0...scheme_sep]
    rest = url[(scheme_sep + 3)..]

    # Use the last '@' as delimiter; passwords may contain '@'.
    at_index = rest.rindex('@')
    return url unless at_index

    userinfo = rest[0...at_index]
    host_and_path = rest[(at_index + 1)..]

    user, pass = userinfo.split(':', 2)
    encoded_user = percent_encode_userinfo(user)
    encoded_pass = pass.nil? ? nil : percent_encode_userinfo(pass)

    rebuilt = if encoded_pass
      "#{scheme}://#{encoded_user}:#{encoded_pass}@#{host_and_path}"
    else
      "#{scheme}://#{encoded_user}@#{host_and_path}"
    end

    # Only return rebuilt if it parses.
    URI.parse(rebuilt)
    rebuilt
  rescue URI::InvalidURIError
    url
  end
end

if ENV['REDIS_URL']
  ENV['REDIS_URL'] = RedisUrl.sanitize(ENV['REDIS_URL'])
end
