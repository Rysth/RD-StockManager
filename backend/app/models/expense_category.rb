class ExpenseCategory < ApplicationRecord
  audited

  has_many :expenses, dependent: :nullify

  validates :name, presence: { message: "El nombre es requerido" }, uniqueness: { message: "Ya existe una categoría con ese nombre" }

  scope :active, -> { where(active: true) }

  def self.ransackable_attributes(_auth_object = nil)
    %w[id name active is_payroll created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[expenses]
  end
end
