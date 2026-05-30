class Account < ApplicationRecord
  include Rodauth::Rails.model
  enum :status, { unverified: 1, verified: 2, closed: 3 }

  # Association
  has_one :user, dependent: :destroy
  has_many :otp_codes, dependent: :destroy

  # Basic validations
  validates :email, presence: { message: "El correo electrónico es requerido" }
  validates :email, uniqueness: { case_sensitive: false, message: "Este correo electrónico ya está en uso", conditions: -> { where.not(status: :closed) } }
  validates :email, format: { 
    with: URI::MailTo::EMAIL_REGEXP, 
    message: "Formato de correo electrónico inválido" 
  }

  # Callbacks
  before_save :downcase_email
  after_commit :send_welcome_notification_async, on: :create

  # Allowlist attributes for Ransack search
  def self.ransackable_attributes(auth_object = nil)
    ["id", "email", "status"]
  end

  private

  def send_welcome_notification_async
    # Send welcome email after user association is created
    if user.present?
      EmailNotificationJob.perform_later(user.id, 'welcome')
    end
  end

  def downcase_email
    self.email = email.downcase if email.present?
  end
end
