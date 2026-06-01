class InvoiceMailer < ApplicationMailer
  def authorized(invoice)
    @invoice  = invoice
    @sale     = invoice.sale
    @customer = @sale.customer
    @business = Business.current

    # Logo embebido (cid:) para clientes de correo que bloquean imágenes externas
    if @business.logo.attached?
      attachments.inline["logo"] = @business.logo.download
      @logo_cid = attachments["logo"].url
    end

    attachments["XML_FACTURA_#{invoice.numero_comprobante}.xml"] = {
      mime_type: "application/xml",
      content: invoice.xml_autorizado
    } if invoice.xml_autorizado.present?

    attachments["RIDE_FACTURA_#{invoice.numero_comprobante}.pdf"] = {
      mime_type: "application/pdf",
      content: invoice.ride_pdf
    } if invoice.ride_pdf.present?

    mail(
      to: @customer.email,
      subject: "Factura electronica #{invoice.numero_comprobante} - #{@business.name_or_default}"
    )
  end
end
