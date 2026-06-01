# Convierte una cotización aceptada en una venta (Sale) pendiente.
# Las líneas con product_variant descuentan inventario al completar la venta; las
# líneas de servicio libres se trasladan sin afectar stock.
# La venta queda en estado :pending — no descuenta stock hasta que se complete
# por el flujo normal de Ventas.
class QuotationConversionService
  class Error < StandardError; end
  class InvalidStatusError < Error; end
  class AlreadyConvertedError < Error; end
  class NoConvertibleItemsError < Error; end

  Result = Struct.new(:sale, :skipped, keyword_init: true)

  def self.convert(quotation:, user: nil)
    new(quotation, user).convert
  end

  def initialize(quotation, user)
    @quotation = quotation
    @user = user
  end

  def convert
    raise AlreadyConvertedError, "La cotización ya fue convertida en venta" if @quotation.converted?
    raise InvalidStatusError, "Solo se pueden convertir cotizaciones aceptadas" unless @quotation.accepted?

    items = @quotation.quotation_items.to_a
    raise NoConvertibleItemsError, "La cotización no tiene líneas para convertir en venta" if items.empty?

    seller = @user || @quotation.user
    raise Error, "No se pudo determinar el vendedor de la venta" if seller.blank?

    sale = nil
    ActiveRecord::Base.transaction do
      sale = Sale.create!(
        customer_id: @quotation.customer_id,
        location_id: @quotation.location_id,
        user: seller,
        status: :pending,
        payment_method: :cash
      )

      items.each do |item|
        sale.sale_items.create!(
          product_variant_id: item.product_variant_id,
          description: item.description,
          quantity: item.quantity.to_i,
          unit_price: item.unit_price
        )
      end

      sale.recalculate_total!
      @quotation.update!(sale: sale)
    end

    Result.new(sale: sale, skipped: [])
  end
end
