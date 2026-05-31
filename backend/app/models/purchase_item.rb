class PurchaseItem < ApplicationRecord
  audited associated_with: :purchase

  belongs_to :purchase
  belongs_to :product_variant

  before_validation :set_unit_cost, on: :create

  validates :quantity, numericality: { greater_than: 0, only_integer: true, message: "La cantidad debe ser mayor a 0" }
  validates :unit_cost, numericality: { greater_than_or_equal_to: 0 }

  def subtotal
    quantity * unit_cost
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id purchase_id product_variant_id quantity unit_cost created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[purchase product_variant]
  end

  private

  # Por defecto usa el costo actual del producto cuando no se especifica.
  def set_unit_cost
    self.unit_cost = product_variant&.product&.cost || 0 unless unit_cost.present? && unit_cost.positive?
  end
end
