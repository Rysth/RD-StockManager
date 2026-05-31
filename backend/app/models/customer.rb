class Customer < ApplicationRecord
  audited

  has_many :sales, dependent: :nullify
  has_many :purchases, dependent: :nullify

  validates :name, presence: { message: "El nombre es requerido" }
  validates :id_type, inclusion: { in: %w[cedula pasaporte ruc], message: "Tipo de documento inválido" }, allow_blank: true
  validate :must_be_customer_or_supplier

  scope :active, -> { where(active: true) }
  scope :customers, -> { where(is_customer: true) }
  scope :suppliers, -> { where(is_supplier: true) }

  # Cuentas por cobrar: ventas completadas no pagadas (deuda del cliente con el negocio).
  def receivable
    sales.completed.sum("total - paid_amount").to_f
  end

  # Cuentas por pagar: compras recibidas no pagadas (deuda del negocio con el proveedor).
  def payable
    purchases.received.sum("total - paid_amount").to_f
  end

  # Saldo neto del contacto (positivo = nos debe; negativo = le debemos).
  def balance
    receivable - payable
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id name phone city id_type id_number country address email
       is_customer is_supplier credit_limit payment_term_days active created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[sales purchases]
  end

  private

  def must_be_customer_or_supplier
    return if is_customer? || is_supplier?

    errors.add(:base, "El contacto debe ser cliente, proveedor o ambos")
  end
end
