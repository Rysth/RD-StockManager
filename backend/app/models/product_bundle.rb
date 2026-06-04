class ProductBundle < ApplicationRecord
  audited

  has_many :product_bundle_items, dependent: :destroy
  has_many :product_variants, through: :product_bundle_items
  has_many :sale_items, dependent: :restrict_with_error

  accepts_nested_attributes_for :product_bundle_items, allow_destroy: true

  validates :name, presence: { message: "El nombre es requerido" }
  validates :base_price, numericality: { greater_than_or_equal_to: 0 }
  validate :must_have_items

  scope :active, -> { where(active: true) }

  def total_cost
    product_bundle_items.includes(product_variant: :product).sum do |item|
      item.quantity * item.product_variant.product.cost
    end
  end

  def stock_for(location)
    return 0 if product_bundle_items.empty?

    product_bundle_items.includes(:product_variant).map do |item|
      item.product_variant.stock_for(location) / item.quantity
    end.min.to_i
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id name description base_price active created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[product_bundle_items product_variants sale_items]
  end

  private

  def must_have_items
    return if product_bundle_items.reject(&:marked_for_destruction?).any?

    errors.add(:base, "El combo debe tener al menos un producto")
  end
end
