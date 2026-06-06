class StockTransfer < ApplicationRecord
  belongs_to :from_location, class_name: "Location"
  belongs_to :to_location,   class_name: "Location"
  belongs_to :requested_by,  class_name: "User"
  belongs_to :received_by,   class_name: "User", optional: true
  has_many   :stock_transfer_items, dependent: :destroy

  enum :status, { pending: 0, received: 1, cancelled: 2 }

  validates :from_location_id, :to_location_id, presence: true
  validates :stock_transfer_items, presence: { message: "debe incluir al menos un producto" }
  validate  :locations_must_differ

  def code
    "TR-#{created_at.year}-#{id.to_s.rjust(6, '0')}"
  end

  def receive!(user)
    return if received?

    transaction do
      stock_transfer_items.includes(:product_variant).each do |item|
        StockMovement.apply!(variant: item.product_variant, location: from_location, delta: -item.quantity)
        StockMovement.apply!(variant: item.product_variant, location: to_location,   delta:  item.quantity)
      end
      update!(status: :received, received_by: user, received_at: Time.current)
    end
  end

  def cancel!
    return if received? || cancelled?
    update!(status: :cancelled)
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id status from_location_id to_location_id requested_by_id created_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[from_location to_location requested_by received_by stock_transfer_items]
  end

  private

  def locations_must_differ
    errors.add(:to_location_id, "debe ser diferente al origen") if from_location_id == to_location_id
  end
end
