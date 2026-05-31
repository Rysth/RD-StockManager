class StockLevel < ApplicationRecord
  belongs_to :product_variant
  belongs_to :location

  validates :quantity, numericality: { greater_than_or_equal_to: 0, only_integer: true }
  validates :product_variant_id, uniqueness: { scope: :location_id }

  def self.ransackable_attributes(_auth_object = nil)
    %w[id product_variant_id location_id quantity created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[product_variant location]
  end
end
