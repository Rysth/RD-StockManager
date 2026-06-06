class ProductBundleItem < ApplicationRecord
  audited associated_with: :product_bundle

  belongs_to :product_bundle
  belongs_to :product_variant

  validates :quantity, numericality: { greater_than: 0, only_integer: true }
  validates :product_variant_id, uniqueness: { scope: :product_bundle_id, message: "ya está en este combo" }

  def self.ransackable_attributes(_auth_object = nil)
    %w[id product_bundle_id product_variant_id quantity created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[product_bundle product_variant]
  end
end
