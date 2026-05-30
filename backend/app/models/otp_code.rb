class OtpCode < ApplicationRecord
  belongs_to :account

  # Scopes
  scope :active, -> { where("expires_at > ? AND used_at IS NULL", Time.current) }
  scope :expired, -> { where("expires_at <= ?", Time.current) }

  # Validations
  validates :code, presence: true, length: { is: 6 }
  validates :account_id, presence: true
  validates :expires_at, presence: true

  # Callbacks
  before_validation :generate_code, on: :create
  before_validation :set_expiration, on: :create

  # Class methods
  def self.generate_for_account(account)
    # Invalidate any existing active codes
    where(account: account).active.destroy_all

    # Create new OTP code
    create!(account: account)
  end

  def self.find_valid_code(account_id, code)
    joins(:account)
      .where(account: { id: account_id })
      .active
      .find_by(code: code)
  end

  # Instance methods
  def expired?
    Time.current > expires_at
  end

  def used?
    used_at.present?
  end

  def valid_code?
    !expired? && !used?
  end

  def mark_as_used!
    update!(used_at: Time.current)
  end

  private

  def generate_code
    # Generate 6-digit code: 100000 to 999999
    self.code = (SecureRandom.random_number(900000) + 100000).to_s
  end

  def set_expiration
    self.expires_at ||= 5.minutes.from_now
  end
end
