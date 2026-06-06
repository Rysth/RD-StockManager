class Sale < ApplicationRecord
  audited

  enum :status, { pending: 0, completed: 1, cancelled: 2 }
  enum :payment_method, { cash: 0, transfer: 1 }, prefix: :payment
  enum :payment_status, { due: 0, partial: 1, paid: 2 }, prefix: :payment

  belongs_to :user
  belongs_to :customer, optional: true
  belongs_to :location, optional: true
  has_many :sale_items, dependent: :destroy
  has_many :invoices, dependent: :destroy

  accepts_nested_attributes_for :sale_items

  validates :status, presence: true

  before_validation :set_sold_at, on: :create
  before_validation :set_location, on: :create

  scope :due_soon, -> { completed.where.not(payment_status: payment_statuses[:paid]).where(due_date: ..Date.current + 7.days) }

  # Recalculate the total from the persisted line items (+ shipping)
  def recalculate_total!
    items_total = sale_items.sum("quantity * unit_price")
    iva_base    = sale_items.where(applies_iva: true).sum("quantity * unit_price").to_d
    iva_amount  = (iva_base * BigDecimal("0.15")).round(2)
    update_column(:total, items_total + iva_amount + shipping_cost.to_d)
    sync_payment_status!
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
    update_column(:payment_status, Sale.payment_statuses[new_status])
  end

  def balance_due
    (total - paid_amount).to_f
  end

  def requires_payment_verification?
    payment_method == "transfer" && !payment_paid?
  end

  # Mark the sale as completed and discount stock for each line item.
  # Idempotent: does nothing if the sale is already completed.
  def complete!
    return if completed?

    if requires_payment_verification?
      errors.add(:base, "La transferencia debe ser verificada antes de completar la venta")
      raise ActiveRecord::RecordInvalid, self
    end

    transaction do
      loc = location || Location.default
      sale_items.includes(:product_bundle, product_variant: :product).each do |item|
        move_stock_for_item(item, loc, -item.quantity)
      end
      # Las ventas POS al contado (no contra entrega) se consideran pagadas al completar.
      self.paid_amount = total if !cash_on_delivery && paid_amount.to_d.zero?
      update!(status: :completed)
      sync_payment_status!
    end
  end

  # Cancel the sale; restore stock only if it had previously been discounted.
  # Bloquea la cancelación si la venta tiene una factura autorizada en producción.
  def cancel!
    return if cancelled?

    if invoices.authorized.where(ambiente: "2").exists?
      errors.add(:base, "No se puede cancelar una venta con factura autorizada en producción")
      raise ActiveRecord::RecordInvalid, self
    end

    transaction do
      if completed?
        loc = location || Location.default
        sale_items.includes(:product_bundle, product_variant: :product).each do |item|
          move_stock_for_item(item, loc, item.quantity)
        end
      end
      update!(status: :cancelled)
    end
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id status total shipping_cost paid_amount payment_status due_date sold_at customer_id user_id location_id payment_method cash_on_delivery created_at updated_at]
  end

  # Última factura electrónica emitida para esta venta (o nil).
  def latest_invoice
    if invoices.loaded?
      invoices.max_by(&:created_at)
    else
      invoices.order(:created_at).last
    end
  end

  def code
    "VTA-#{(sold_at || created_at).year}-#{id.to_s.rjust(6, '0')}"
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[customer user location sale_items invoices]
  end

  private

  def move_stock_for_item(item, loc, delta)
    if item.product_bundle.present?
      item.product_bundle.product_bundle_items.includes(:product_variant).each do |bundle_item|
        StockMovement.apply!(variant: bundle_item.product_variant, location: loc, delta: delta * bundle_item.quantity)
      end
      return
    end

    return if item.product_variant.blank? || item.product_variant.product&.service?

    StockMovement.apply!(variant: item.product_variant, location: loc, delta: delta)
  end

  def set_sold_at
    self.sold_at ||= Time.current
  end

  def set_location
    self.location ||= Location.default
  end
end
