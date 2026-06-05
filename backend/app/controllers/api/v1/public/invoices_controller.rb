module Api
  module V1
    module Public
      class InvoicesController < BaseController
        # GET /api/v1/public/invoices/verify/:clave_acceso
        def verify
          invoice = Invoice.includes(:sale).find_by(clave_acceso: params[:clave_acceso].to_s)
          return render_error("Factura no encontrada", :not_found) unless invoice&.authorized?

          snapshot = invoice.comprador_snapshot || {}
          business = Business.current

          render_success(
            invoice: {
              estado: invoice.estado,
              authorized: invoice.authorized?,
              clave_acceso: invoice.clave_acceso,
              numero_autorizacion: invoice.numero_autorizacion,
              fecha_autorizacion: invoice.fecha_autorizacion,
              numero_comprobante: invoice.numero_comprobante,
              ambiente: invoice.ambiente,
              importe_total: invoice.importe_total,
              emisor: {
                ruc: business.ruc,
                razon_social: business.razon_social,
                nombre_comercial: business.name
              },
              comprador: {
                razon_social: snapshot["razon_social"],
                identificacion: snapshot["identificacion"]
              }
            }
          )
        end
      end
    end
  end
end
