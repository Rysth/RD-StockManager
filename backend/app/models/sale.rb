class Sale < ApplicationRecord
  audited

  enum :status, { pending: 0, completed: 1, cancelled: 2 }
  enum :payment_method, { cash: 0, transfer: 1 }, prefix: :payment

  belongs_to :user
  belongs_to :customer, optional: true
  has_many :sale_items, dependent: :destroy

  accepts_nested_attributes_for :sale_items

  validates :status, presence: true

  before_validation :set_sold_at, on: :create

  # Recalculate the total from the persisted line items
  def recalculate_total!
    update_column(:total, sale_items.sum("quantity * unit_price"))
  end

  # Mark the sale as completed and discount stock for each line item.
  # Idempotent: does nothing if the sale is already completed.
  def complete!
    return if completed?

    transaction do
      sale_items.includes(:product_variant).each do |item|
        item.product_variant.decrement!(:stock, item.quantity)
      end
      update!(status: :completed)
    end
  end

  # Cancel the sale; restore stock only if it had previously been discounted.
  def cancel!
    return if cancelled?

    transaction do
      if completed?
        sale_items.includes(:product_variant).each do |item|
          item.product_variant.increment!(:stock, item.quantity)
        end
      end
      update!(status: :cancelled)
    end
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id status total sold_at customer_id user_id payment_method cash_on_delivery created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[customer user sale_items]
  end

  private

  def set_sold_at
    self.sold_at ||= Time.current
  end
end
