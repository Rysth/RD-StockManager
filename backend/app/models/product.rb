class Product < ApplicationRecord
  belongs_to :category
  has_many :product_variants, dependent: :destroy

  accepts_nested_attributes_for :product_variants, allow_destroy: true

  validates :name, presence: { message: "El nombre es requerido" }
  validates :base_price, numericality: { greater_than_or_equal_to: 0, message: "El precio debe ser mayor o igual a 0" }

  scope :active, -> { where(active: true) }

  # Total stock across all variants
  def total_stock
    product_variants.sum(:stock)
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id name brand base_price description active category_id created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[category product_variants]
  end
end
