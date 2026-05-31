class InvoiceMailer < ApplicationMailer
  def authorized(invoice)
    @invoice = invoice
    @sale = invoice.sale
    @customer = @sale.customer
    @business = Business.current

    attachments["#{invoice.clave_acceso}.xml"] = {
      mime_type: "application/xml",
      content: invoice.xml_autorizado
    } if invoice.xml_autorizado.present?

    attachments["#{invoice.clave_acceso}.pdf"] = {
      mime_type: "application/pdf",
      content: invoice.ride_pdf
    } if invoice.ride_pdf.present?

    mail(
      to: @customer.email,
      subject: "Factura electronica #{invoice.numero_comprobante} - #{@business.name_or_default}"
    )
  end
end
