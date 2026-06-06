module Api
  module V1
    class SalesController < BaseController
      MONTH_ABBR_ES = [nil, "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].freeze

      INVOICE_ACTIONS = [:invoice, :invoice_xml, :invoice_ride, :send_invoice_email].freeze

      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_SALES) }, except: [:report, *INVOICE_ACTIONS]
      before_action -> { authorize_permission!(Permission::VIEW_REPORTS) }, only: [:report]
      before_action -> { authorize_permission!(Permission::MANAGE_INVOICING) }, only: INVOICE_ACTIONS
      before_action :set_sale, only: [:show, :update, :destroy, :sync_items]
      before_action :set_sale_for_invoice, only: [:invoice]
      before_action :set_sale_for_invoice_download, only: [:invoice_xml, :invoice_ride, :send_invoice_email]

      # GET /api/v1/sales
      def index
        @q = Sale.includes(:customer, :user, :location, :invoices).ransack(search_params)
        @q.sorts = "sold_at desc" if @q.sorts.empty?

        @pagy, sales = pagy(@q.result(distinct: true), page: params[:page] || 1, limit: params[:per_page] || 12)
        sales = sales.to_a
        item_counts = SaleItem.where(sale_id: sales.map(&:id)).group(:sale_id).count

        render_success(
          sales: sales.map { |s| serialize(s, items_count: item_counts[s.id].to_i) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/sales/:id
      def show
        render_success(sale: serialize(@sale, with_items: true))
      end

      # POST /api/v1/sales
      # Body: { sale: { customer_id, status }, items: [{ product_variant_id, quantity, unit_price }] }
      def create
        items = params[:items] || []
        if items.empty?
          return render_error("La venta debe tener al menos un producto", :unprocessable_entity)
        end

        # Los empleados restringidos solo pueden vender desde su sucursal asignada.
        user = current_rodauth_user
        effective_location_id =
          if user.restricted_to_location? && user.location_id.present?
            user.location_id
          else
            sale_params[:location_id].presence
          end

        sale = nil
        ActiveRecord::Base.transaction do
          sale = Sale.new(
            customer_id: sale_params[:customer_id],
            location_id: effective_location_id,
            user: current_rodauth_user,
            status: :pending,
            payment_method: sale_params[:payment_method].presence || :cash,
            shipping_cost: sale_params[:shipping_cost].presence || 0,
            sri_iva_rate: sale_params[:sri_iva_rate].presence || 0,
            cash_on_delivery: ActiveModel::Type::Boolean.new.cast(sale_params[:cash_on_delivery]) || false
          )
          sale.save!

          items.each do |item|
            sale.sale_items.create!(
              product_variant_id: item[:product_variant_id],
              product_bundle_id: item[:product_bundle_id],
              description: item[:description],
              quantity: item[:quantity].to_i,
              unit_price: item[:unit_price],
              applies_iva: ActiveModel::Type::Boolean.new.cast(item[:applies_iva]) || false
            )
          end

          sale.recalculate_total!
          sale.complete! if desired_status == "completed" && sale.payment_method != "transfer"
        end

        Rails.cache.delete("inventory:stats")
        render_success({ sale: serialize(sale.reload, with_items: true) }, "Venta registrada correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo registrar la venta", :unprocessable_entity, e.record.errors.full_messages)
      end

      # PUT /api/v1/sales/:id  — used to complete or cancel a pending sale
      def update
        case desired_status
        when "completed"
          @sale.complete!
        when "cancelled"
          @sale.cancel!
        else
          return render_error("No se puede editar una venta con factura autorizada", :unprocessable_entity) if @sale.invoices.authorized.exists?

          @sale.update!(sale_update_params)
          @sale.recalculate_total! if sale_update_params.key?(:shipping_cost)
        end
        Rails.cache.delete("inventory:stats")
        render_success({ sale: serialize(@sale.reload, with_items: true) }, "Venta actualizada correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo actualizar la venta", :unprocessable_entity, e.record.errors.full_messages)
      end

      # DELETE /api/v1/sales/:id — cancel only (no physical delete, for traceability).
      # Restores stock if the sale had discounted it.
      def destroy
        @sale.cancel!
        Rails.cache.delete("inventory:stats")
        render_success({ sale: serialize(@sale.reload, with_items: true) }, "Venta cancelada correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo cancelar la venta", :unprocessable_entity, e.record.errors.full_messages)
      end

      # PUT /api/v1/sales/:id/sync_items — reemplaza los items de una venta pendiente.
      # Body: { items: [{ product_variant_id, quantity, unit_price }] }
      def sync_items
        unless @sale.pending?
          return render_error("Solo se pueden modificar los items de ventas pendientes", :unprocessable_entity)
        end

        items = params[:items] || []
        if items.empty?
          return render_error("La venta debe tener al menos un producto", :unprocessable_entity)
        end

        ActiveRecord::Base.transaction do
          @sale.sale_items.destroy_all
          items.each do |item|
            @sale.sale_items.create!(
              product_variant_id: item[:product_variant_id],
              product_bundle_id: item[:product_bundle_id],
              description: item[:description],
              quantity: item[:quantity].to_i,
              unit_price: item[:unit_price],
              applies_iva: ActiveModel::Type::Boolean.new.cast(item[:applies_iva]) || false
            )
          end
          @sale.recalculate_total!
        end

        Rails.cache.delete("inventory:stats")
        render_success({ sale: serialize(@sale.reload, with_items: true) }, "Items actualizados correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudieron actualizar los items", :unprocessable_entity, e.record.errors.full_messages)
      end

      # POST /api/v1/sales/:id/invoice — emite la factura electrónica SRI de la venta.
      def invoice
        inv = InvoiceService.generate(sale: @sale)
        if inv.authorized?
          render_success({ invoice: serialize_invoice(inv) }, "Factura autorizada por el SRI")
        else
          render json: {
            status: :error,
            message: "El SRI no autorizó la factura (#{inv.estado})",
            invoice: serialize_invoice(inv),
            errors: inv.mensajes
          }, status: :unprocessable_entity
        end
      rescue InvoiceService::AlreadyAuthorizedError => e
        render_error(e.message, :conflict)
      rescue InvoiceService::NotCompletedError, InvoiceService::MissingEmisorError, InvoiceService::InvoicingDisabledError, InvoiceService::InvoiceError => e
        render_error(e.message, :unprocessable_entity)
      end

      # POST /api/v1/sales/:id/send_invoice_email — reenvía el email de la factura al cliente.
      def send_invoice_email
        inv = @sale.invoices.authorized.order(:created_at).last
        return render_error("No hay factura autorizada para esta venta", :not_found) unless inv

        email = (params[:email].presence || @sale.customer&.email.presence)
        return render_error("El cliente no tiene correo registrado", :unprocessable_entity) unless email

        if @sale.customer && params[:email].present? && @sale.customer.email != params[:email]
          @sale.customer.update(email: params[:email])
        end

        InvoiceMailer.authorized(inv, email).deliver_later
        render_success({}, "Factura enviada a #{email}")
      rescue StandardError => e
        render_error("No se pudo enviar el correo: #{e.message}", :unprocessable_entity)
      end

      # GET /api/v1/sales/:id/invoice_xml — descarga el XML autorizado.
      def invoice_xml
        inv = @sale.invoices.authorized.order(:created_at).last
        return render_error("No hay factura autorizada para esta venta", :not_found) unless inv&.xml_autorizado.present?

        send_data inv.xml_autorizado, type: "application/xml",
                  filename: "Factura_#{inv.numero_comprobante}.xml", disposition: "attachment"
      end

      # GET /api/v1/sales/:id/invoice_ride — descarga el RIDE (PDF).
      def invoice_ride
        inv = @sale.invoices.authorized.order(:created_at).last
        return render_error("No hay RIDE disponible para esta venta", :not_found) unless inv&.ride_pdf.present?

        send_data inv.ride_pdf, type: "application/pdf",
                  filename: "RIDE_#{inv.numero_comprobante}.pdf", disposition: "attachment"
      end

      # GET /api/v1/sales/report
      def report
        now = Time.current
        @location_id = params[:location_id].presence
        completed = Sale.completed
        completed = completed.where(location_id: @location_id) if @location_id

        render_success(
          summary: {
            revenue_today: completed.where(sold_at: now.beginning_of_day..now).sum(:total),
            revenue_week: completed.where(sold_at: now.beginning_of_week..now).sum(:total),
            revenue_month: completed.where(sold_at: now.beginning_of_month..now).sum(:total),
            sales_today: completed.where(sold_at: now.beginning_of_day..now).count,
            profit_today: profit_sum(now.beginning_of_day..now),
            profit_week: profit_sum(now.beginning_of_week..now),
            profit_month: profit_sum(now.beginning_of_month..now)
          },
          total_profit: profit_sum,
          sales_by_day: sales_by_day(completed, now),
          top_products: top_products,
          revenue_by_month: revenue_by_month(completed, now)
        )
      end

      private

      def set_sale
        @sale = Sale.includes(:customer, :user, :location, :invoices, sale_items: [:product_bundle, { product_variant: :product }]).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Venta no encontrada", :not_found)
      end

      def set_sale_for_invoice
        @sale = Sale.includes(:customer, sale_items: [:product_bundle, { product_variant: :product }]).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Venta no encontrada", :not_found)
      end

      def set_sale_for_invoice_download
        @sale = Sale.includes(:invoices).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Venta no encontrada", :not_found)
      end

      def sale_params
        params.fetch(:sale, {}).permit(:customer_id, :location_id, :status, :payment_method, :cash_on_delivery, :shipping_cost, :sri_iva_rate)
      end

      def sale_update_params
        params.fetch(:sale, {}).permit(:customer_id, :location_id, :payment_method, :cash_on_delivery, :shipping_cost, :sri_iva_rate)
      end

      def desired_status
        (params.dig(:sale, :status) || params[:status]).to_s
      end

      def search_params
        search = {}
        search[:status_eq] = Sale.statuses[params[:status]] if params[:status].present? && Sale.statuses.key?(params[:status])
        search[:customer_name_cont] = params[:search] if params[:search].present?
        search[:location_id_eq] = params[:location_id] if params[:location_id].present?
        search[:user_id_eq] = params[:user_id] if params[:user_id].present?

        # Los empleados solo ven sus propias ventas y de su sucursal asignada.
        user = current_rodauth_user
        if user.restricted_to_location?
          search[:user_id_eq] = user.id
          search[:location_id_eq] = user.location_id
        end

        search
      end

      def serialize(sale, with_items: false, items_count: nil)
        data = {
          id: sale.id,
          code: sale.code,
          status: sale.status,
          total: sale.total,
          shipping_cost: sale.shipping_cost,
          sold_at: sale.sold_at,
          customer_id: sale.customer_id,
          customer_name: sale.customer&.name,
          customer_email: sale.customer&.email,
          location_id: sale.location_id,
          location_name: sale.location&.name,
          seller: sale.user&.fullname,
          payment_method: sale.payment_method,
          cash_on_delivery: sale.cash_on_delivery,
          sri_iva_rate: sale.sri_iva_rate,
          items_count: items_count || (sale.sale_items.loaded? ? sale.sale_items.length : sale.sale_items.count),
          created_at: sale.created_at,
          invoice: serialize_invoice(sale.latest_invoice)
        }

        if with_items
          data[:items] = sale.sale_items.map do |item|
            {
              id: item.id,
              product_variant_id: item.product_variant_id,
              product_bundle_id: item.product_bundle_id,
              sku: item.product_bundle.present? ? "COMBO" : item.product_variant&.sku,
              product_name: item.product_bundle&.name || item.product_variant&.product&.name || item.description,
              size: item.product_variant&.size,
              color: item.product_variant&.color,
              quantity: item.quantity,
              unit_price: item.unit_price,
              unit_cost: item.unit_cost,
              subtotal: item.subtotal,
              profit: item.profit,
              images: item.product_variant ? item.product_variant.images.map { |img| { id: img.id, url: url_for(img) } } : []
            }
          end
          data[:profit] = sale.sale_items.sum(&:profit)
        end

        data
      end

      # Resumen de la factura electrónica para la UI (o nil si no se ha emitido).
      def serialize_invoice(inv)
        return nil unless inv

        {
          id: inv.id,
          estado: inv.estado,
          authorized: inv.authorized?,
          clave_acceso: inv.clave_acceso,
          numero_comprobante: inv.numero_comprobante,
          numero_autorizacion: inv.numero_autorizacion,
          fecha_autorizacion: inv.fecha_autorizacion,
          ambiente: inv.ambiente,
          importe_total: inv.importe_total,
          mensajes: inv.mensajes
        }
      end

      # Real profit across completed sale items, optionally within a date range
      def profit_sum(date_range = nil)
        rel = SaleItem.joins(:sale).where(sales: { status: Sale.statuses[:completed] })
        rel = rel.where(sales: { location_id: @location_id }) if @location_id
        rel = rel.where(sales: { sold_at: date_range }) if date_range
        rel.sum(Arel.sql("sale_items.quantity * (sale_items.unit_price - sale_items.unit_cost)")).to_f
      end

      def sales_by_day(scope, now)
        counts = scope.where(sold_at: 29.days.ago.beginning_of_day..now)
                      .group(Arel.sql("DATE(sold_at)")).sum(:total)
        (0..29).map do |i|
          day = (now - (29 - i).days).to_date
          { date: day.strftime("%d/%m"), day: day.iso8601, revenue: counts[day]&.to_f || 0.0 }
        end
      end

      def top_products
        rel = SaleItem.joins(:sale, product_variant: :product)
                      .joins("LEFT JOIN brands ON brands.id = products.brand_id")
                      .where(sales: { status: Sale.statuses[:completed] })
        rel = rel.where(sales: { location_id: @location_id }) if @location_id
        rel.group("products.id", "products.name", "brands.name")
                .order(Arel.sql("SUM(sale_items.quantity) DESC"))
                .limit(10)
                .pluck("products.name", "brands.name", Arel.sql("SUM(sale_items.quantity)"), Arel.sql("SUM(sale_items.quantity * sale_items.unit_price)"))
                .map do |name, brand, qty, revenue|
          { name: name, brand: brand, units_sold: qty.to_i, revenue: revenue.to_f }
        end
      end

      def revenue_by_month(scope, now)
        (0..5).map do |i|
          month_start = (now - i.months).beginning_of_month
          month_end = (now - i.months).end_of_month
          {
            month: month_start.strftime("%Y-%m"),
            label: "#{MONTH_ABBR_ES[month_start.month]} #{month_start.year}",
            revenue: scope.where(sold_at: month_start..month_end).sum(:total).to_f,
            profit: profit_sum(month_start..month_end),
            count: scope.where(sold_at: month_start..month_end).count
          }
        end.reverse
      end

      def pagination_data(pagy)
        {
          current_page: pagy.page,
          total_pages: pagy.pages,
          total_count: pagy.count,
          per_page: pagy.limit
        }
      end
    end
  end
end
