class PurchasePayment < ApplicationRecord
  audited

  belongs_to :purchase
  has_one_attached :proof_image

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :payment_method, presence: true, inclusion: { in: %w[cash transfer] }

  enum :payment_method, { cash: 0, transfer: 1 }

  after_create :recalculate_purchase_paid_amount

  private

  def recalculate_purchase_paid_amount
    total_paid = purchase.purchase_payments.sum(:amount)
    purchase.update!(paid_amount: [total_paid, purchase.total].min)
    purchase.sync_payment_status!
  end
end
