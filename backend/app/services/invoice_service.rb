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

  IVA_CODIGO_PORCENTAJE = {
    0 => "0",
    12 => "2",
    15 => "4"
  }.freeze

  # id_type de Customer -> tipoIdentificacion del SRI.
  ID_TYPE_MAP = { "cedula" => "05", "ruc" => "04", "pasaporte" => "06" }.freeze
  # payment_method de Sale -> formaPago del SRI ("01" sin sistema financiero, "20" otros).
  FORMA_PAGO  = { "cash" => "01", "transfer" => "20" }.freeze
  DUPLICATE_SECUENCIAL_IDENTIFIER = "45".freeze
  MAX_DUPLICATE_SECUENCIAL_RETRIES = 25
  SUPPORTED_RIDE_LOGO_TYPES = %w[image/png image/jpeg image/jpg].freeze
  DEFAULT_RIDE_LOGO_PATH = Rails.root.join("app", "assets", "images", "rysth_logo.png")

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

    comprador = build_comprador

    attempts = 0
    loop do
      invoice = reserve_invoice(business)
      factura = build_factura(business, comprador, invoice.secuencial, invoice.establecimiento, invoice.punto_emision)
      result = emitir(factura)
      persisted_invoice = persist_invoice(invoice, comprador, factura, result)

      return persisted_invoice unless duplicate_secuencial?(result) && attempts < MAX_DUPLICATE_SECUENCIAL_RETRIES

      attempts += 1
      Rails.logger.warn(
        "[InvoiceService] Secuencial #{invoice.numero_comprobante} ya registrado en SRI; " \
        "reintentando con el siguiente (intento #{attempts}/#{MAX_DUPLICATE_SECUENCIAL_RETRIES})"
      )
    end
  end

  private

  # Reserva atómica del secuencial persistiendo una fila ERROR antes de contactar al SRI.
  # Así otra emisión concurrente ve el número ya tomado aunque esta llamada tarde en autorizarse.
  def reserve_invoice(business)
    est = business.establecimiento
    pe  = business.punto_emision
    ActiveRecord::Base.transaction do
      locked_business = Business.lock.find(business.id)
      local_next = Invoice.where(establecimiento: est, punto_emision: pe).maximum(:secuencial).to_i + 1
      next_secuencial = [locked_business.sri_next_factura_secuencial.to_i, local_next].max

      Invoice.create!(
        sale: @sale,
        secuencial: next_secuencial,
        establecimiento: est,
        punto_emision: pe,
        ambiente: @sri_config.ambiente.to_s,
        estado: Invoice::ESTADO_ERROR,
        mensajes: [{ identificador: "LOCAL", mensaje: "Secuencial reservado", tipo: "INFO" }]
      ).tap do
        locked_business.update_columns(
          sri_next_factura_secuencial: next_secuencial + 1,
          updated_at: Time.current
        )
      end
    end
  rescue ActiveRecord::RecordNotUnique => e
    raise InvoiceError, "Colisión de secuencial, reintente la emisión: #{e.message}"
  end

  def build_factura(business, comprador, secuencial, est, pe)
    logo = ride_logo_for(business)
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
      contribuyente_rimpe: business.contribuyente_rimpe.presence,
      logo_data: logo&.fetch(:data),
      logo_content_type: logo&.fetch(:content_type)
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
      base_unit = sri_unit_price(item.unit_price)
      line_base = (BigDecimal(item.quantity.to_s) * base_unit).round(2)
      impuesto = item.applies_iva? ? sri_iva_15(line_base) : SriFacturacion::Impuesto.iva_cero(line_base)
      SriFacturacion::Detalle.new(
        descripcion: item.product_bundle&.name || item.product_variant&.product&.name || item.description,
        codigo_principal: item.product_bundle.present? ? "COMBO-#{item.product_bundle_id}" : item.product_variant&.sku || "SERV-#{item.id}",
        cantidad: item.quantity,
        precio_unitario: base_unit,
        descuento: 0,
        unidad_medida: "UNIDAD",
        impuestos: [impuesto]
      )
    end
  end

  def build_shipping_detalle
    base = BigDecimal(@sale.shipping_cost.to_s).round(6)
    line_base = base.round(2)
    SriFacturacion::Detalle.new(
      descripcion: "Costo de envío",
      codigo_principal: "ENVIO",
      cantidad: 1,
      precio_unitario: base,
      descuento: 0,
      unidad_medida: "SERVICIO",
      impuestos: [SriFacturacion::Impuesto.iva_cero(line_base)]
    )
  end

  # Los precios en sale_items son precios base (sin IVA); el IVA se añade encima.
  def sri_unit_price(price)
    BigDecimal(price.to_s).round(6)
  end

  def sri_iva_15(line_base)
    SriFacturacion::Impuesto.iva(
      line_base,
      tarifa: 15,
      codigo_porcentaje: IVA_CODIGO_PORCENTAJE.fetch(15, "4")
    )
  end

  def ride_logo_for(business)
    if business.logo.attached? && SUPPORTED_RIDE_LOGO_TYPES.include?(business.logo.blob.content_type.to_s.downcase)
      return { data: business.logo.download, content_type: business.logo.blob.content_type }
    end

    return unless File.exist?(DEFAULT_RIDE_LOGO_PATH)

    { data: File.binread(DEFAULT_RIDE_LOGO_PATH), content_type: "image/png" }
  rescue StandardError => e
    Rails.logger.warn("[InvoiceService] No se pudo cargar logo para RIDE: #{e.class} #{e.message}")
    nil
  end

  def emitir(factura)
    client = SriFacturacion::Client.new(config: @sri_config)
    signer = client.send(:signer)
    if signer
      cert = signer.certificate
      Rails.logger.info("[InvoiceService] Certificado: subject=#{cert.subject}, issuer=#{cert.issuer}, not_after=#{cert.not_after}")
    end
    result = client.emitir!(factura, generar_ride: true)
    Rails.logger.info(
      "[InvoiceService] Resultado SRI estado=#{result&.estado.inspect} " \
      "clave=#{result&.clave_acceso.inspect} xml_firmado=#{result&.xml_firmado.present?} " \
      "signer_verify_available=#{SriFacturacion::Signer.respond_to?(:verify_signature)} " \
      "mensajes=#{Array(result&.mensajes).inspect}"
    )
    if result&.respond_to?(:xml_firmado) && result.xml_firmado.present? && SriFacturacion::Signer.respond_to?(:verify_signature)
      sig_valid = SriFacturacion::Signer.verify_signature(result.xml_firmado, signer)
      Rails.logger.info("[InvoiceService] Self-verify de firma: #{sig_valid ? 'OK' : 'FALLÓ'}")
    end
    result
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

  def duplicate_secuencial?(result)
    return false unless result&.estado == Invoice::ESTADO_DEVUELTA

    Array(result.mensajes).any? do |mensaje|
      mensaje[:identificador].to_s == DUPLICATE_SECUENCIAL_IDENTIFIER ||
        mensaje["identificador"].to_s == DUPLICATE_SECUENCIAL_IDENTIFIER ||
        mensaje[:mensaje].to_s.match?(/SECUENCIAL REGISTRADO/i) ||
        mensaje["mensaje"].to_s.match?(/SECUENCIAL REGISTRADO/i)
    end
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

    InvoiceMailer.authorized(invoice, invoice.sale.customer.email).deliver_later
  rescue StandardError => e
    Rails.logger.warn("[InvoiceService] No se pudo encolar email factura=#{invoice.id}: #{e.class} #{e.message}")
  end
end
