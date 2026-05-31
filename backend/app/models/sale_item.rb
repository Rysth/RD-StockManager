class SaleItem < ApplicationRecord
  audited associated_with: :sale

  belongs_to :sale
  belongs_to :product_variant

  before_validation :set_unit_price, on: :create

  validates :quantity, numericality: { greater_than: 0, only_integer: true, message: "La cantidad debe ser mayor a 0" }
  validate :sufficient_stock, on: :create

  def subtotal
    quantity * unit_price
  end

  # Real profit for this line: (sale price - cost) * quantity
  def profit
    (unit_price - unit_cost) * quantity
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id sale_id product_variant_id quantity unit_price created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[sale product_variant]
  end

  private

  # Default the unit price to the product's base price when not provided,
  # and snapshot the current product cost for accurate profit reporting.
  def set_unit_price
    self.unit_price = product_variant&.product&.base_price || 0 unless unit_price.present? && unit_price.positive?
    self.unit_cost = product_variant&.product&.cost || 0 if unit_cost.blank? || unit_cost.zero?
  end

  # Ensure there is enough stock at the sale's location to fulfil this line item
  def sufficient_stock
    return if product_variant.blank? || quantity.blank?

    location = sale&.location || Location.default
    available = product_variant.stock_for(location)
    if quantity > available
      errors.add(:quantity, "Stock insuficiente para #{product_variant.sku} (disponible: #{available})")
    end
  end
end
