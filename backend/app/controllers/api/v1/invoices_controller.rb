module Api
  module V1
    # Listado y consulta de facturas electrónicas SRI ya emitidas. La emisión vive en
    # SalesController#invoice; aquí solo se visualizan/descargan los comprobantes existentes.
    class InvoicesController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_INVOICING) }
      before_action :set_invoice, only: [:show, :xml, :ride]

      # GET /api/v1/invoices
      def index
        @q = Invoice.includes(sale: :customer).ransack(search_params)
        @q.sorts = "created_at desc" if @q.sorts.empty?

        @pagy, invoices = pagy(@q.result, page: params[:page] || 1, limit: params[:per_page] || 12)

        render_success(
          invoices: invoices.map { |inv| serialize(inv) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/invoices/:id
      def show
        render_success(invoice: serialize(@invoice, detailed: true))
      end

      # GET /api/v1/invoices/:id/xml — descarga el XML autorizado.
      def xml
        return render_error("No hay XML autorizado para esta factura", :not_found) unless @invoice.xml_autorizado.present?

        send_data @invoice.xml_autorizado, type: "application/xml",
                  filename: "#{@invoice.clave_acceso}.xml", disposition: "attachment"
      end

      # GET /api/v1/invoices/:id/ride — descarga el RIDE (PDF).
      def ride
        return render_error("No hay RIDE disponible para esta factura", :not_found) unless @invoice.ride_pdf.present?

        send_data @invoice.ride_pdf, type: "application/pdf",
                  filename: "#{@invoice.clave_acceso}.pdf", disposition: "attachment"
      end

      private

      def set_invoice
        @invoice = Invoice.includes(sale: :customer).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Factura no encontrada", :not_found)
      end

      def search_params
        search = {}
        search[:clave_acceso_cont] = params[:search] if params[:search].present?
        search[:estado_eq] = params[:estado] if params[:estado].present?
        search[:ambiente_eq] = params[:ambiente] if params[:ambiente].present?
        search
      end

      def pagination_data(pagy)
        {
          current_page: pagy.page,
          total_pages: pagy.pages,
          total_count: pagy.count,
          per_page: pagy.limit
        }
      end

      def serialize(inv, detailed: false)
        snapshot = inv.comprador_snapshot || {}
        data = {
          id: inv.id,
          sale_id: inv.sale_id,
          estado: inv.estado,
          authorized: inv.authorized?,
          clave_acceso: inv.clave_acceso,
          numero_comprobante: inv.numero_comprobante,
          numero_autorizacion: inv.numero_autorizacion,
          fecha_autorizacion: inv.fecha_autorizacion,
          ambiente: inv.ambiente,
          importe_total: inv.importe_total,
          cliente: snapshot["razon_social"].presence || inv.sale&.customer&.name || "CONSUMIDOR FINAL",
          identificacion: snapshot["identificacion"],
          sold_at: inv.sale&.sold_at,
          has_xml: inv.xml_autorizado.present?,
          has_ride: inv.ride_pdf.present?,
          created_at: inv.created_at
        }
        data[:mensajes] = inv.mensajes if detailed
        data
      end
    end
  end
end
