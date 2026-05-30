require 'sidekiq'
require 'sidekiq-scheduler'

Sidekiq.configure_server do |config|
  config.redis = { url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/1') }

  # Load sidekiq-scheduler schedule
  config.on(:startup) do
    schedule_file = File.expand_path('../../sidekiq.yml', __FILE__)
    if File.exist?(schedule_file)
      schedule = YAML.load_file(schedule_file)
      Sidekiq.schedule = schedule[:schedule] if schedule[:schedule]
      SidekiqScheduler::Scheduler.instance.reload_schedule! if Sidekiq.schedule
    end
    
    # Schedule OTP cleanup job to run every hour
    OtpCleanupJob.set(wait: 1.hour).perform_later
  end
end

Sidekiq.configure_client do |config|
  config.redis = { url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/1') }
end