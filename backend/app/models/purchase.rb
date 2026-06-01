class Purchase < ApplicationRecord
  audited

  enum :status, { draft: 0, received: 1, cancelled: 2 }
  enum :payment_status, { due: 0, partial: 1, paid: 2 }, prefix: :payment

  belongs_to :customer, optional: true # proveedor
  belongs_to :location, optional: true
  belongs_to :user, optional: true
  has_many :purchase_items, dependent: :destroy
  has_many :purchase_payments, dependent: :destroy

  accepts_nested_attributes_for :purchase_items

  validates :status, presence: true

  before_validation :set_purchase_date, on: :create
  before_validation :set_location, on: :create

  scope :due_soon, -> { received.where.not(payment_status: payment_statuses[:paid]).where(due_date: ..Date.current + 7.days) }

  # Recalcula totales a partir de los ítems persistidos.
  def recalculate_total!
    items_subtotal = purchase_items.sum("quantity * unit_cost")
    update_columns(
      subtotal: items_subtotal,
      total: items_subtotal - discount + tax
    )
    sync_payment_status!
  end

  # Marca la compra como recibida y SUMA stock por cada ítem en la ubicación.
  # Idempotente: no hace nada si ya está recibida.
  def receive!
    return if received?

    transaction do
      loc = location || Location.default
      purchase_items.includes(:product_variant).each do |item|
        StockMovement.apply!(variant: item.product_variant, location: loc, delta: item.quantity)
        update_variant_cost(item)
      end
      update!(status: :received)
    end
  end

  # Cancela la compra; revierte stock solo si previamente se había recibido.
  def cancel!
    return if cancelled?

    transaction do
      if received?
        loc = location || Location.default
        purchase_items.includes(:product_variant).each do |item|
          StockMovement.apply!(variant: item.product_variant, location: loc, delta: -item.quantity)
        end
      end
      update!(status: :cancelled)
    end
  end

  # Recalcula el estado de pago a partir del monto pagado.
  def sync_payment_status!
    new_status =
      if paid_amount >= total && total.positive?
        :paid
      elsif paid_amount.positive?
        :partial
      else
        :due
      end
    update_column(:payment_status, Purchase.payment_statuses[new_status])
  end

  def balance_due
    (total - paid_amount).to_f
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id status payment_status total paid_amount purchase_date due_date customer_id user_id location_id reference created_at updated_at]
  end

  def code
    "COM-#{(purchase_date || created_at).year}-#{id.to_s.rjust(6, '0')}"
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[customer user location purchase_items]
  end

  private

  def set_purchase_date
    self.purchase_date ||= Time.current
  end

  def set_location
    self.location ||= Location.default
  end

  # Actualiza el costo del producto con el último costo de compra (last cost).
  def update_variant_cost(item)
    product = item.product_variant&.product
    return if product.nil? || item.unit_cost.to_f <= 0

    product.update_column(:cost, item.unit_cost)
  end
end
