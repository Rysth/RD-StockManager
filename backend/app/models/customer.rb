class Customer < ApplicationRecord
  has_many :sales, dependent: :nullify

  validates :name, presence: { message: "El nombre es requerido" }

  def self.ransackable_attributes(_auth_object = nil)
    %w[id name phone city created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[sales]
  end
end
