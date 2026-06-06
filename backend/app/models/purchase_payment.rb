class PurchasePayment < ApplicationRecord
  audited

  belongs_to :purchase
  has_one_attached :proof_image

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :payment_method, presence: true, inclusion: { in: %w[cash transfer] }
  validate :amount_cannot_exceed_purchase_balance, on: :create

  enum :payment_method, { cash: 0, transfer: 1 }

  after_create :recalculate_purchase_paid_amount

  private

  def amount_cannot_exceed_purchase_balance
    return if purchase.blank? || amount.blank?
    return if amount <= purchase.balance_due.to_d

    errors.add(:amount, "no puede exceder el saldo pendiente")
  end

  def recalculate_purchase_paid_amount
    total_paid = purchase.paid_amount.to_d + amount.to_d
    purchase.update!(paid_amount: [total_paid, purchase.total].min)
    purchase.sync_payment_status!
  end
end
