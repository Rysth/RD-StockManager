# LogBench initializer
# This initializer enables LogBench with sensible defaults in development.
# You can customize by editing the block below or creating your own initializer.

if defined?(LogBench)
  LogBench.setup do |config|
    # Enable in development by default
    config.enabled = Rails.env.development?

    # Lograge is not used in this app anymore.
    config.configure_lograge_automatically = false

    # Minimal init message (set :full for more verbosity)
    config.show_init_message = :min

    # Which controllers to inject request_id tracking into
    # Defaults to ApplicationController and ActionController::Base
    # config.base_controller_classes = %w[ApplicationController ActionController::Base]
  end
end
