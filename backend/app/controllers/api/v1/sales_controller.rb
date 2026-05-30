module Api
  module V1
    class SalesController < BaseController
      MONTH_ABBR_ES = [nil, "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].freeze

      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_SALES) }, except: [:report]
      before_action -> { authorize_permission!(Permission::VIEW_REPORTS) }, only: [:report]
      before_action :set_sale, only: [:show, :update, :destroy]

      # GET /api/v1/sales
      def index
        @q = Sale.includes(:customer, :user, sale_items: { product_variant: :product }).ransack(search_params)
        @q.sorts = "sold_at desc" if @q.sorts.empty?

        @pagy, sales = pagy(@q.result(distinct: true), page: params[:page] || 1, limit: params[:per_page] || 12)

        render_success(
          sales: sales.map { |s| serialize(s) },
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

        sale = nil
        ActiveRecord::Base.transaction do
          sale = Sale.new(
            customer_id: sale_params[:customer_id],
            user: current_rodauth_user,
            status: :pending,
            payment_method: sale_params[:payment_method].presence || :cash,
            cash_on_delivery: ActiveModel::Type::Boolean.new.cast(sale_params[:cash_on_delivery]) || false
          )
          sale.save!

          items.each do |item|
            sale.sale_items.create!(
              product_variant_id: item[:product_variant_id],
              quantity: item[:quantity].to_i,
              unit_price: item[:unit_price]
            )
          end

          sale.recalculate_total!
          sale.complete! if desired_status == "completed"
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

      # GET /api/v1/sales/report
      def report
        now = Time.current
        completed = Sale.completed

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
        @sale = Sale.includes(:customer, :user, sale_items: { product_variant: :product }).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Venta no encontrada", :not_found)
      end

      def sale_params
        params.fetch(:sale, {}).permit(:customer_id, :status, :payment_method, :cash_on_delivery)
      end

      def desired_status
        (params.dig(:sale, :status) || params[:status]).to_s
      end

      def search_params
        search = {}
        search[:status_eq] = Sale.statuses[params[:status]] if params[:status].present? && Sale.statuses.key?(params[:status])
        search[:customer_name_cont] = params[:search] if params[:search].present?
        search
      end

      def serialize(sale, with_items: false)
        data = {
          id: sale.id,
          status: sale.status,
          total: sale.total,
          sold_at: sale.sold_at,
          customer_id: sale.customer_id,
          customer_name: sale.customer&.name,
          seller: sale.user&.fullname,
          payment_method: sale.payment_method,
          cash_on_delivery: sale.cash_on_delivery,
          items_count: sale.sale_items.size,
          created_at: sale.created_at
        }

        if with_items
          data[:items] = sale.sale_items.map do |item|
            {
              id: item.id,
              product_variant_id: item.product_variant_id,
              sku: item.product_variant.sku,
              product_name: item.product_variant.product.name,
              size: item.product_variant.size,
              color: item.product_variant.color,
              quantity: item.quantity,
              unit_price: item.unit_price,
              unit_cost: item.unit_cost,
              subtotal: item.subtotal,
              profit: item.profit
            }
          end
          data[:profit] = sale.sale_items.sum(&:profit)
        end

        data
      end

      # Real profit across completed sale items, optionally within a date range
      def profit_sum(date_range = nil)
        rel = SaleItem.joins(:sale).where(sales: { status: Sale.statuses[:completed] })
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
        SaleItem.joins(:sale, product_variant: :product)
                .joins("LEFT JOIN brands ON brands.id = products.brand_id")
                .where(sales: { status: Sale.statuses[:completed] })
                .group("products.id", "products.name", "brands.name")
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
