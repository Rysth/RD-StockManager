class Customer < ApplicationRecord
  audited

  has_many :sales, dependent: :nullify
  has_many :purchases, dependent: :nullify

  validates :name, presence: { message: "El nombre es requerido" }
  validates :id_type, presence: { message: "El tipo de documento es requerido" },
                      inclusion: { in: %w[cedula pasaporte ruc], message: "Tipo de documento inválido" }
  validates :id_number, presence: { message: "El número de documento es requerido" }
  validate :must_be_customer_or_supplier
  validate :valid_id_number_for_type

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

  def code
    "CON-#{id.to_s.rjust(6, '0')}"
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

  def valid_id_number_for_type
    return if id_type.blank? || id_number.blank?

    sri_type = { "cedula" => "05", "ruc" => "04", "pasaporte" => "06" }[id_type]
    result = SriFacturacion::IdentificacionValidator.validar(sri_type, id_number)
    return if result.valido?

    errors.add(:base, "Número de documento: #{result.error}")
  end
end
