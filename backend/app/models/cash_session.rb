class CashSession < ApplicationRecord
  audited

  enum :status, { open: 0, closed: 1 }, prefix: :session

  belongs_to :user
  belongs_to :location
  has_many :sales, dependent: :nullify

  validates :opening_amount, numericality: { greater_than_or_equal_to: 0 }
  validate :one_open_session_per_user_location, on: :create

  before_validation :set_opened_at, on: :create

  scope :open_sessions, -> { where(status: statuses[:open]) }

  # Caja abierta del usuario en la sucursal indicada (o nil).
  def self.current_for(user, location)
    return nil if user.blank? || location.blank?

    open_sessions.find_by(user: user, location: location)
  end

  # Efectivo esperado en caja: apertura + ventas al contado completadas de la sesión.
  def expected_cash
    opening_amount.to_d + sales.completed.payment_cash.sum(:total).to_d
  end

  # Cierra la caja: registra lo contado, calcula esperado y diferencia.
  def close!(counted, notes_text = nil)
    return self if session_closed?

    with_lock do
      self.counted_amount  = counted.to_d
      self.expected_amount = expected_cash
      self.variance        = counted_amount - expected_amount
      self.notes           = notes_text
      self.closed_at       = Time.current
      self.status          = :closed
      save!
    end
    self
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id user_id location_id status opening_amount counted_amount expected_amount variance opened_at closed_at created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[user location sales]
  end

  private

  def set_opened_at
    self.opened_at ||= Time.current
  end

  def one_open_session_per_user_location
    return unless session_open?
    return if user_id.blank? || location_id.blank?

    if CashSession.open_sessions.where(user_id: user_id, location_id: location_id).exists?
      errors.add(:base, "Ya tienes una caja abierta en esta sucursal")
    end
  end
end
