class Customer < ApplicationRecord
  audited

  has_many :sales, dependent: :nullify

  validates :name, presence: { message: "El nombre es requerido" }
  validates :id_type, inclusion: { in: %w[cedula pasaporte ruc], message: "Tipo de documento inválido" }, allow_blank: true

  scope :active, -> { where(active: true) }

  def self.ransackable_attributes(_auth_object = nil)
    %w[id name phone city id_type id_number country address active created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[sales]
  end
end
