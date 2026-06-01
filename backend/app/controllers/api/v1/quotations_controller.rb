module Api
  module V1
    class QuotationsController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_QUOTATIONS) }
      before_action :set_quotation, only: [:show, :update, :destroy, :convert]

      # GET /api/v1/quotations
      def index
        @q = Quotation.includes(:customer, :user, :quotation_items, :sale).ransack(search_params)
        @q.sorts = "created_at desc" if @q.sorts.empty?

        @pagy, quotations = pagy(@q.result(distinct: true), page: params[:page] || 1, limit: params[:per_page] || 12)
        render_success(
          quotations: quotations.map { |qt| serialize(qt) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/quotations/:id
      def show
        render_success(quotation: serialize(@quotation, with_items: true))
      end

      # POST /api/v1/quotations
      # Body: { quotation: { customer_id, location_id, status, tax_rate, valid_until, notes },
      #         items: [{ product_variant_id?, description, quantity, unit_price }] }
      def create
        items = params[:items] || []
        return render_error("La cotización debe tener al menos un ítem", :unprocessable_entity) if items.empty?

        quotation = nil
        ActiveRecord::Base.transaction do
          quotation = Quotation.new(
            customer_id: quotation_params[:customer_id],
            location_id: quotation_params[:location_id],
            user: current_rodauth_user,
            status: quotation_params[:status].presence || :draft,
            tax_rate: quotation_params[:tax_rate].presence || 15,
            valid_until: quotation_params[:valid_until],
            notes: quotation_params[:notes]
          )
          quotation.save!
          build_items(quotation, items)
          quotation.recalculate_total!
        end

        render_success({ quotation: serialize(quotation.reload, with_items: true) }, "Cotización creada correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo crear la cotización", :unprocessable_entity, e.record.errors.full_messages)
      end

      # PUT /api/v1/quotations/:id
      # Permite editar campos y, si se envían items, reemplaza las líneas.
      def update
        return render_error("No se puede editar una cotización aceptada o convertida", :unprocessable_entity) if locked_quotation?(@quotation)

        ActiveRecord::Base.transaction do
          @quotation.update!(quotation_params.to_h.compact)
          if params[:items].present?
            @quotation.quotation_items.destroy_all
            build_items(@quotation, params[:items])
          end
          @quotation.recalculate_total!
        end

        render_success({ quotation: serialize(@quotation.reload, with_items: true) }, "Cotización actualizada correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo actualizar la cotización", :unprocessable_entity, e.record.errors.full_messages)
      end

      # DELETE /api/v1/quotations/:id
      def destroy
        return render_error("No se puede eliminar una cotización aceptada o convertida", :unprocessable_entity) if locked_quotation?(@quotation)

        @quotation.destroy!
        render_success({}, "Cotización eliminada correctamente")
      rescue ActiveRecord::RecordNotDestroyed
        render_error("No se pudo eliminar la cotización", :unprocessable_entity)
      end

      # POST /api/v1/quotations/:id/convert — genera una venta a partir de la cotización.
      def convert
        result = QuotationConversionService.convert(quotation: @quotation, user: current_rodauth_user)

        sale_code = result.sale.code
        message = "Cotización convertida en #{sale_code}"
        message += ". Se omitieron #{result.skipped.size} línea(s)." if result.skipped.any?

        Rails.cache.delete("inventory:stats")
        render_success(
          { quotation: serialize(@quotation.reload, with_items: true), sale_id: result.sale.id, sale_code: sale_code },
          message
        )
      rescue QuotationConversionService::AlreadyConvertedError => e
        render_error(e.message, :conflict)
      rescue QuotationConversionService::Error => e
        render_error(e.message, :unprocessable_entity)
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo convertir la cotización", :unprocessable_entity, e.record.errors.full_messages)
      end

      private

      def set_quotation
        @quotation = if action_name == "show"
                       Quotation.includes(:customer, :user, :sale, quotation_items: { product_variant: :product }).find(params[:id])
                     else
                       Quotation.includes(:quotation_items, :sale).find(params[:id])
                     end
      rescue ActiveRecord::RecordNotFound
        render_error("Cotización no encontrada", :not_found)
      end

      def build_items(quotation, items)
        items.each do |item|
          quotation.quotation_items.create!(
            product_variant_id: item[:product_variant_id].presence,
            description: item[:description],
            quantity: item[:quantity].presence || 1,
            unit_price: item[:unit_price].presence || 0
          )
        end
      end

      def locked_quotation?(quotation)
        quotation.accepted? || quotation.converted?
      end

      def quotation_params
        params.fetch(:quotation, {}).permit(:customer_id, :location_id, :status, :tax_rate, :valid_until, :notes)
      end

      def search_params
        search = {}
        search[:status_eq] = Quotation.statuses[params[:status]] if params[:status].present? && Quotation.statuses.key?(params[:status])
        search[:quotation_number_or_customer_name_cont] = params[:search] if params[:search].present?
        search[:customer_id_eq] = params[:customer_id] if params[:customer_id].present?
        search
      end

      def serialize(quotation, with_items: false)
        data = {
          id: quotation.id,
          quotation_number: quotation.quotation_number,
          status: quotation.status,
          customer_id: quotation.customer_id,
          customer_name: quotation.customer&.name,
          customer_email: quotation.customer&.email,
          customer_phone: quotation.customer&.phone,
          location_id: quotation.location_id,
          seller: quotation.user&.fullname,
          tax_rate: quotation.tax_rate,
          subtotal: quotation.subtotal,
          tax_amount: quotation.tax_amount,
          total: quotation.total,
          valid_until: quotation.valid_until,
          notes: quotation.notes,
          sale_id: quotation.sale_id,
          sale_code: quotation.sale&.code,
          converted: quotation.converted?,
          items_count: quotation.quotation_items.loaded? ? quotation.quotation_items.length : quotation.quotation_items.count,
          created_at: quotation.created_at
        }

        if with_items
          data[:quotation_items] = quotation.quotation_items.map do |item|
            {
              id: item.id,
              product_variant_id: item.product_variant_id,
              sku: item.product_variant&.sku,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.subtotal
            }
          end
        end

        data
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
