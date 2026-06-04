class SaleItem < ApplicationRecord
  audited associated_with: :sale

  belongs_to :sale
  belongs_to :product_variant, optional: true
  belongs_to :product_bundle, optional: true

  before_validation :set_unit_price, on: :create
  before_validation :set_description

  validates :description, presence: { message: "La descripción es requerida" }, if: -> { product_variant.blank? && product_bundle.blank? }
  validates :quantity, numericality: { greater_than: 0, only_integer: true, message: "La cantidad debe ser mayor a 0" }
  validate :single_sellable_reference
  validate :sufficient_stock, on: :create

  def subtotal
    quantity * unit_price
  end

  # Real profit for this line: (sale price - cost) * quantity
  def profit
    (unit_price - unit_cost) * quantity
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id sale_id product_variant_id product_bundle_id description quantity unit_price created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[sale product_variant product_bundle]
  end

  private

  # Default the unit price to the product's base price when not provided,
  # and snapshot the current product cost for accurate profit reporting.
  def set_unit_price
    self.unit_price = product_bundle&.base_price || product_variant&.product&.base_price || 0 unless unit_price.present? && unit_price.positive?
    self.unit_cost = product_bundle&.total_cost || product_variant&.product&.cost || 0 if unit_cost.blank? || unit_cost.zero?
  end

  def set_description
    self.description = product_bundle.name if description.blank? && product_bundle.present?
    self.description = product_variant&.product&.name if description.blank? && product_variant.present?
  end

  def single_sellable_reference
    return unless product_variant.present? && product_bundle.present?

    errors.add(:base, "La línea no puede ser producto y combo a la vez")
  end

  def sufficient_stock
    return if quantity.blank?

    if product_bundle.present?
      location = sale&.location || Location.default
      available = product_bundle.stock_for(location)
      if quantity > available
        errors.add(:quantity, "Stock insuficiente para combo #{product_bundle.name} (disponible: #{available})")
      end
      return
    end

    return if product_variant.blank?
    return if product_variant.product&.service?

    location = sale&.location || Location.default
    available = product_variant.stock_for(location)
    if quantity > available
      errors.add(:quantity, "Stock insuficiente para #{product_variant.sku} (disponible: #{available})")
    end
  end
end
