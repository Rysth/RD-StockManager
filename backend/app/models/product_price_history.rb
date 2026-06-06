class ProductPriceHistory < ApplicationRecord
  belongs_to :product
  belongs_to :user, class_name: "Account", optional: true

  validates :old_cost, :new_cost, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :old_base_price, :new_base_price, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :old_wholesale_price, :new_wholesale_price, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :source, presence: true

  def self.ransackable_attributes(_auth_object = nil)
    %w[id product_id old_cost new_cost old_base_price new_base_price old_wholesale_price new_wholesale_price source purchase_id created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[product user]
  end
end
