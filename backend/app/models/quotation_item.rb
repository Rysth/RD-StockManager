class QuotationItem < ApplicationRecord
  audited associated_with: :quotation

  belongs_to :quotation
  belongs_to :product_variant, optional: true

  before_validation :set_from_variant, on: :create

  validates :description, presence: { message: "La descripción es requerida" }
  validates :quantity, numericality: { greater_than: 0, message: "La cantidad debe ser mayor a 0" }
  validates :unit_price, numericality: { greater_than_or_equal_to: 0 }

  def subtotal
    quantity * unit_price
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id quotation_id product_variant_id description quantity unit_price created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[quotation product_variant]
  end

  private

  # Cuando la línea referencia una variante de inventario y la descripción o el
  # precio vienen vacíos, autocompletarlos desde el producto (igual idea que
  # SaleItem#set_unit_price). Las líneas de servicio libres no tienen variante.
  def set_from_variant
    return if product_variant.blank?

    if description.blank?
      self.description = [product_variant.product&.name, product_variant.size, product_variant.color].compact_blank.join(" ")
    end

    if unit_price.blank? || unit_price.to_d.zero?
      self.unit_price = product_variant.product&.base_price || 0
    end
  end
end
