class Brand < ApplicationRecord
  audited

  has_many :products, dependent: :restrict_with_error

  validates :name, presence: { message: "El nombre es requerido" }
  validates :name, uniqueness: { message: "Esta marca ya existe" }

  scope :active, -> { where(active: true) }

  def self.ransackable_attributes(_auth_object = nil)
    %w[id name description active created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[products]
  end
end
