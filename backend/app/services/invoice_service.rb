require "bigdecimal"

# Emite la factura electrónica (comprobante "01") de una venta ante el SRI usando la
# gema SriFacturacion, y persiste el resultado en un registro Invoice.
#
#   InvoiceService.generate(sale: sale) #=> Invoice
#
# Es sin estado salvo por la reserva del secuencial, que se serializa bajo un lock de
# la fila singleton de `businesses`. Cualquier fallo del SRI/red se captura y se
# persiste como un Invoice en estado ERROR (no propaga 500).
class InvoiceService
  class InvoiceError < StandardError; end
  class NotCompletedError < InvoiceError; end
  class AlreadyAuthorizedError < InvoiceError; end
  class MissingEmisorError < InvoiceError; end
  class InvoicingDisabledError < InvoiceError; end

  # true  => unit_price YA incluye IVA (precio al público) -> base = price / 1.15
  # false => unit_price es base sin IVA, el IVA se SUMA encima (el total facturado sube ~15%)
  # Decisión del negocio (EDLU): precios cargados netos -> false.
  PRICES_INCLUDE_IVA = false

  IVA_TARIFA      = 15
  IVA_CODIGO_PORC = "4".freeze
  IVA_DIVISOR     = BigDecimal("1.15")

  # id_type de Customer -> tipoIdentificacion del SRI.
  ID_TYPE_MAP = { "cedula" => "05", "ruc" => "04", "pasaporte" => "06" }.freeze
  # payment_method de Sale -> formaPago del SRI ("01" sin sistema financiero, "20" otros).
  FORMA_PAGO  = { "cash" => "01", "transfer" => "20" }.freeze

  def self.generate(sale:)
    new(sale).generate
  end

  def initialize(sale)
    @sale = sale
  end

  def generate
    raise NotCompletedError, "La venta debe estar completada para facturar" unless @sale.completed?
    raise AlreadyAuthorizedError, "La venta ya tiene una factura autorizada" if @sale.invoices.authorized.exists?

    business = Business.current
    unless business.sri_ready?
      missing = business.sri_missing_requirements.join(", ")
      raise InvoicingDisabledError, "La facturación electrónica SRI no está lista: #{missing}"
    end

    @sri_config = build_sri_config(business)

    invoice = reserve_invoice(business)
    comprador = build_comprador
    factura   = build_factura(business, comprador, invoice.secuencial, invoice.establecimiento, invoice.punto_emision)

    result = emitir(factura)
    persist_invoice(invoice, comprador, factura, result)
  end

  private

  # Reserva atómica del secuencial persistiendo una fila ERROR antes de contactar al SRI.
  # Así otra emisión concurrente ve el número ya tomado aunque esta llamada tarde en autorizarse.
  def reserve_invoice(business)
    est = business.establecimiento
    pe  = business.punto_emision
    ActiveRecord::Base.transaction do
      Business.lock.find(business.id)
      last = Invoice.where(establecimiento: est, punto_emision: pe).maximum(:secuencial).to_i
      Invoice.create!(
        sale: @sale,
        secuencial: last + 1,
        establecimiento: est,
        punto_emision: pe,
        ambiente: @sri_config.ambiente.to_s,
        estado: Invoice::ESTADO_ERROR,
        mensajes: [{ identificador: "LOCAL", mensaje: "Secuencial reservado", tipo: "INFO" }]
      )
    end
  rescue ActiveRecord::RecordNotUnique => e
    raise InvoiceError, "Colisión de secuencial, reintente la emisión: #{e.message}"
  end

  def build_factura(business, comprador, secuencial, est, pe)
    emisor = SriFacturacion::Emisor.new(
      ruc: business.ruc,
      razon_social: business.razon_social,
      nombre_comercial: business.name.presence,
      dir_matriz: business.dir_matriz,
      dir_establecimiento: business.dir_establecimiento.presence,
      establecimiento: est,
      punto_emision: pe,
      obligado_contabilidad: business.obligado_contabilidad,
      contribuyente_especial: business.contribuyente_especial.presence,
      contribuyente_rimpe: business.contribuyente_rimpe.presence
    )

    detalles = build_detalles
    detalles << build_shipping_detalle if @sale.shipping_cost.to_d.positive?

    importe_total = SriFacturacion::Totales.calculate(detalles).importe_total
    pago = SriFacturacion::Pago.new(total: importe_total, forma_pago: FORMA_PAGO.fetch(@sale.payment_method, "01"))

    SriFacturacion::Factura.new(
      emisor: emisor,
      comprador: comprador,
      detalles: detalles,
      fecha_emision: (@sale.sold_at || Time.current).in_time_zone('America/Guayaquil').to_date,
      secuencial: secuencial,
      pagos: [pago],
      tipo_emision: "1"
    )
  end

  def build_comprador
    c = @sale.customer
    return SriFacturacion::Comprador.consumidor_final if c.nil?

    tipo = ID_TYPE_MAP[c.id_type]
    if tipo.nil? || c.id_number.blank? || !SriFacturacion::IdentificacionValidator.valido?(tipo, c.id_number)
      Rails.logger.warn("[InvoiceService] Cliente #{c.id} sin identificación válida; se factura a consumidor final")
      return SriFacturacion::Comprador.consumidor_final
    end

    SriFacturacion::Comprador.new(
      razon_social: c.name,
      tipo_identificacion: tipo,
      identificacion: c.id_number,
      direccion: c.address.presence,
      email: c.email.presence,
      telefono: c.phone.presence
    )
  end

  def build_detalles
    @sale.sale_items.map do |item|
      base_unit = base_unit_price(item.unit_price)
      line_base = (BigDecimal(item.quantity.to_s) * base_unit).round(2)
      SriFacturacion::Detalle.new(
        descripcion: item.product_variant.product.name,
        codigo_principal: item.product_variant.sku,
        cantidad: item.quantity,
        precio_unitario: base_unit,
        descuento: 0,
        unidad_medida: "UNIDAD",
        impuestos: [SriFacturacion::Impuesto.iva(line_base, tarifa: IVA_TARIFA, codigo_porcentaje: IVA_CODIGO_PORC)]
      )
    end
  end

  def build_shipping_detalle
    base = base_unit_price(@sale.shipping_cost)
    line_base = base.round(2)
    SriFacturacion::Detalle.new(
      descripcion: "Costo de envío",
      codigo_principal: "ENVIO",
      cantidad: 1,
      precio_unitario: base,
      descuento: 0,
      unidad_medida: "SERVICIO",
      impuestos: [SriFacturacion::Impuesto.iva(line_base, tarifa: IVA_TARIFA, codigo_porcentaje: IVA_CODIGO_PORC)]
    )
  end

  # Base sin IVA por unidad (6 decimales, según permite el SRI).
  def base_unit_price(price)
    d = BigDecimal(price.to_s)
    PRICES_INCLUDE_IVA ? (d / IVA_DIVISOR).round(6) : d.round(6)
  end

  def emitir(factura)
    SriFacturacion::Client.new(config: @sri_config).emitir!(factura, generar_ride: true)
  rescue SriFacturacion::Error => e
    @emit_error = e.message
    Rails.logger.error("[InvoiceService] Error SRI venta=#{@sale.id}: #{e.class} #{e.message}")
    nil
  rescue StandardError => e
    @emit_error = "Error inesperado al emitir la factura"
    Rails.logger.error("[InvoiceService] Error inesperado venta=#{@sale.id}: #{e.class} #{e.message}")
    nil
  end

  def persist_invoice(invoice, comprador, factura, result)
    attrs = {
      ambiente: @sri_config.ambiente.to_s,
      importe_total: factura.totales.importe_total,
      comprador_snapshot: {
        razon_social: comprador.razon_social,
        tipo_identificacion: comprador.tipo_identificacion,
        identificacion: comprador.identificacion
      }
    }

    if result
      attrs[:estado]              = result.estado.presence || Invoice::ESTADO_ERROR
      attrs[:clave_acceso]        = result.clave_acceso
      attrs[:numero_autorizacion] = result.numero_autorizacion
      attrs[:fecha_autorizacion]  = result.fecha_autorizacion
      attrs[:xml_firmado]         = result.xml_firmado
      attrs[:xml_autorizado]      = result.xml_autorizado
      attrs[:ride_pdf]            = result.ride_pdf
      attrs[:mensajes]            = Array(result.mensajes)
    else
      attrs[:estado]   = Invoice::ESTADO_ERROR
      attrs[:mensajes] = [{ identificador: "LOCAL", mensaje: @emit_error.presence || "No se pudo contactar al SRI", tipo: "ERROR" }]
    end

    invoice.update!(attrs)
    send_authorized_email(invoice) if invoice.authorized?
    invoice
  end

  def build_sri_config(business)
    SriFacturacion::Configuration.new.tap do |config|
      config.ambiente = business.sri_ambiente_for_emission
      config.cert_path = business.sri_cert_path_for_emission
      config.cert_password = business.sri_cert_password_for_emission
      config.max_retries = SriFacturacion.configuration.max_retries
      config.retry_delay = SriFacturacion.configuration.retry_delay
      config.open_timeout = SriFacturacion.configuration.open_timeout
      config.read_timeout = SriFacturacion.configuration.read_timeout
    end
  end

  def send_authorized_email(invoice)
    return unless invoice.sale.customer&.email.present?

    InvoiceMailer.authorized(invoice).deliver_later
  rescue StandardError => e
    Rails.logger.warn("[InvoiceService] No se pudo encolar email factura=#{invoice.id}: #{e.class} #{e.message}")
  end
end
