class Quotation < ApplicationRecord
  audited

  enum :status, { draft: 0, sent: 1, accepted: 2, rejected: 3, expired: 4 }

  belongs_to :user, optional: true
  belongs_to :customer, optional: true
  belongs_to :location, optional: true
  belongs_to :sale, optional: true # venta generada al convertir la cotización
  has_many :quotation_items, dependent: :destroy

  accepts_nested_attributes_for :quotation_items, allow_destroy: true

  validates :quotation_number, presence: true, uniqueness: true
  validates :tax_rate, numericality: { greater_than_or_equal_to: 0 }

  before_validation :assign_number, on: :create
  before_validation :set_valid_until, on: :create

  # Recalcula subtotal/IVA/total a partir de los items persistidos.
  # StockManager maneja precios netos con IVA 15% (ver InvoiceService).
  def recalculate_total!
    sub = quotation_items.sum("quantity * unit_price").to_d
    tax = (sub * tax_rate.to_d / 100).round(2)
    update_columns(subtotal: sub, tax_amount: tax, total: (sub + tax))
  end

  # ¿Ya se generó una venta a partir de esta cotización?
  def converted?
    sale_id.present?
  end

  # Siguiente número de cotización con formato COT-YYYY-000001.
  def self.next_number
    year = Date.current.year
    last = where("quotation_number ~ ?", "^COT-#{year}-[0-9]+$")
             .order(Arel.sql("LENGTH(quotation_number) DESC, quotation_number DESC"))
             .limit(1)
             .pick(:quotation_number)
    seq = last ? last.split("-").last.to_i + 1 : 1
    format("COT-%d-%06d", year, seq)
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id quotation_number status total subtotal tax_amount valid_until customer_id user_id location_id sale_id created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[customer user location sale quotation_items]
  end

  private

  def assign_number
    self.quotation_number = self.class.next_number if quotation_number.blank?
  end

  def set_valid_until
    self.valid_until ||= Date.current + 7.days
  end
end
