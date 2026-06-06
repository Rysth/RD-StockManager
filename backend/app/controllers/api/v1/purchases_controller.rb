module Api
  module V1
    class PurchasesController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_PURCHASES) }, except: [:index, :show, :due]
      before_action -> { authorize_permission!(Permission::VIEW_PURCHASES) }, only: [:index, :show, :due]
      before_action :set_purchase, only: [:show, :update, :destroy]
      after_action :clear_inventory_cache, only: [:create, :update, :destroy]

      # GET /api/v1/purchases
      def index
        @q = Purchase.includes(:customer, :user, :location).ransack(search_params)
        @q.sorts = "purchase_date desc" if @q.sorts.empty?

        @pagy, purchases = pagy(@q.result(distinct: true), page: params[:page] || 1, limit: params[:per_page] || 12)
        purchases = purchases.to_a
        item_counts = PurchaseItem.where(purchase_id: purchases.map(&:id)).group(:purchase_id).count

        render_success(
          purchases: purchases.map { |p| serialize(p, items_count: item_counts[p.id].to_i) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/purchases/:id
      def show
        render_success(purchase: serialize(@purchase, with_items: true))
      end

      # GET /api/v1/purchases/due — compras por pagar que vencen en los próximos 7 días
      def due
        purchases = Purchase.due_soon.includes(:customer, :location).order(:due_date)
        render_success(purchases: purchases.map { |p| serialize(p) })
      end

      # POST /api/v1/purchases
      # Body: { purchase: { customer_id, location_id, status, discount, tax, paid_amount, due_date, reference, notes },
      #         items: [{ product_variant_id, quantity, unit_cost }] }
      def create
        items = params[:items] || []
        if items.empty?
          return render_error("La compra debe tener al menos un producto", :unprocessable_entity)
        end

        purchase = nil
        ActiveRecord::Base.transaction do
          purchase = Purchase.new(
            customer_id: purchase_params[:customer_id].presence,
            location_id: purchase_params[:location_id].presence,
            user: current_rodauth_user,
            status: :draft,
            discount: purchase_params[:discount].presence || 0,
            tax: purchase_params[:tax].presence || 0,
            paid_amount: purchase_params[:paid_amount].presence || 0,
            due_date: purchase_params[:due_date].presence,
            reference: purchase_params[:reference],
            notes: purchase_params[:notes]
          )
          purchase.save!

          items.each do |item|
            purchase.purchase_items.create!(
              product_variant_id: item[:product_variant_id],
              quantity: item[:quantity].to_i,
              unit_cost: item[:unit_cost],
              discount: item[:discount].to_d,
              applies_iva: item[:applies_iva] != false
            )
          end

          purchase.recalculate_total!
          purchase.receive! if desired_status == "received"
        end

        render_success({ purchase: serialize(purchase.reload, with_items: true) }, "Compra registrada correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo registrar la compra", :unprocessable_entity, e.record.errors.full_messages)
      end

      # PUT /api/v1/purchases/:id — editar borrador, recibir/cancelar o actualizar pago
      def update
        ActiveRecord::Base.transaction do
          update_draft_details! if editable_payload?

          case desired_status
          when "received"  then @purchase.receive!
          when "cancelled" then @purchase.cancel!
          end

          if purchase_params.key?(:paid_amount) && !editable_payload?
            paid_amount = purchase_params[:paid_amount].to_d
            paid_amount = 0.to_d if paid_amount.negative?
            @purchase.update!(paid_amount: [paid_amount, @purchase.total].min)
            @purchase.sync_payment_status!
          end
        end

        render_success({ purchase: serialize(@purchase.reload, with_items: true) }, "Compra actualizada correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo actualizar la compra", :unprocessable_entity, e.record.errors.full_messages)
      rescue ArgumentError => e
        render_error(e.message, :unprocessable_entity)
      end

      # DELETE /api/v1/purchases/:id — cancela (restaura stock si estaba recibida)
      def destroy
        @purchase.cancel!
        render_success({ purchase: serialize(@purchase.reload, with_items: true) }, "Compra cancelada correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo cancelar la compra", :unprocessable_entity, e.record.errors.full_messages)
      end

      private

      def set_purchase
        @purchase = Purchase.includes(:customer, :user, :location, purchase_items: { product_variant: :product }).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Compra no encontrada", :not_found)
      end

      def purchase_params
        params.fetch(:purchase, {}).permit(:customer_id, :location_id, :status, :discount, :tax, :paid_amount, :due_date, :reference, :notes)
      end

      def item_params
        params.fetch(:items, []).map do |item|
          item.respond_to?(:permit) ? item.permit(:id, :product_variant_id, :quantity, :unit_cost, :discount, :applies_iva) : item
        end
      end

      def editable_payload?
        detail_keys = %w[customer_id location_id discount tax paid_amount reference notes]
        params[:items].present? || detail_keys.any? { |key| params.dig(:purchase, key).present? || params.dig(:purchase, key) == "" }
      end

      def update_draft_details!
        raise ArgumentError, "Solo se pueden editar compras por recibir" unless @purchase.draft?

        attrs = {}
        editable_attrs = %i[customer_id location_id discount tax reference notes]
        editable_attrs.each do |attr|
          attrs[attr] = purchase_params[attr].presence if purchase_params.key?(attr)
        end
        @purchase.update!(attrs) if attrs.any?

        item_params.each do |item|
          purchase_item = @purchase.purchase_items.find_by(id: item[:id])
          raise ArgumentError, "Ítem de compra inválido" if purchase_item.nil?

          purchase_item.update!(
            quantity: item[:quantity].to_i,
            unit_cost: item[:unit_cost].to_d,
            discount: item[:discount].to_d,
            applies_iva: item[:applies_iva] != false
          )
        end

        @purchase.recalculate_total!
        paid_amount = purchase_params.key?(:paid_amount) ? purchase_params[:paid_amount].to_d : @purchase.paid_amount
        paid_amount = 0.to_d if paid_amount.negative?
        @purchase.update!(paid_amount: [paid_amount, @purchase.total].min)
        @purchase.sync_payment_status!
      end

      def desired_status
        (params.dig(:purchase, :status) || params[:status]).to_s
      end

      def search_params
        search = {}
        search[:status_eq] = Purchase.statuses[params[:status]] if params[:status].present? && Purchase.statuses.key?(params[:status])
        search[:payment_status_eq] = Purchase.payment_statuses[params[:payment_status]] if params[:payment_status].present? && Purchase.payment_statuses.key?(params[:payment_status])
        search[:customer_name_cont] = params[:search] if params[:search].present?
        search[:location_id_eq] = params[:location_id] if params[:location_id].present?
        search
      end

      def serialize(purchase, with_items: false, items_count: nil)
        data = {
          id: purchase.id,
          code: purchase.code,
          status: purchase.status,
          payment_status: purchase.payment_status,
          subtotal: purchase.subtotal,
          discount: purchase.discount,
          tax: purchase.tax,
          total: purchase.total,
          paid_amount: purchase.paid_amount,
          balance_due: purchase.balance_due,
          purchase_date: purchase.purchase_date,
          due_date: purchase.due_date,
          reference: purchase.reference,
          notes: purchase.notes,
          supplier_id: purchase.customer_id,
          supplier_name: purchase.customer&.name,
          location_id: purchase.location_id,
          location_name: purchase.location&.name,
          created_by: purchase.user&.fullname,
          items_count: items_count || (purchase.purchase_items.loaded? ? purchase.purchase_items.length : purchase.purchase_items.count),
          created_at: purchase.created_at
        }

        if with_items
          data[:items] = purchase.purchase_items.map do |item|
            {
              id: item.id,
              product_variant_id: item.product_variant_id,
              sku: item.product_variant.sku,
              product_name: item.product_variant.product.name,
              size: item.product_variant.size,
              color: item.product_variant.color,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              discount: item.discount,
              applies_iva: item.applies_iva,
              tax_amount: item.tax_amount,
              subtotal: item.subtotal,
              total: item.total
            }
          end
          data[:payments] = purchase.purchase_payments.order(created_at: :desc).map do |pp|
            {
              id: pp.id,
              amount: pp.amount,
              payment_method: pp.payment_method,
              proof_image_url: pp.proof_image.attached? ? url_for(pp.proof_image) : nil,
              created_at: pp.created_at
            }
          end
          data[:paid_amount] = purchase.paid_amount
          data[:payment_status] = purchase.payment_status
        end

        data
      end

      def clear_inventory_cache
        Rails.cache.delete("inventory:stats")
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
