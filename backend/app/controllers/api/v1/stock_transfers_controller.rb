module Api
  module V1
    class StockTransfersController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_PURCHASES) }, except: [:index, :show]
      before_action -> { authorize_permission!(Permission::VIEW_PURCHASES) }, only: [:index, :show]
      before_action :set_transfer, only: [:show, :receive, :cancel, :destroy]
      after_action :clear_inventory_cache, only: [:receive, :cancel, :destroy]

      # GET /api/v1/stock_transfers
      def index
        @q = StockTransfer
               .includes(:from_location, :to_location, :requested_by, :received_by)
               .ransack(search_params)
        @q.sorts = "created_at desc" if @q.sorts.empty?

        @pagy, transfers = pagy(@q.result(distinct: true), page: params[:page] || 1, limit: params[:per_page] || 15)
        item_counts = StockTransferItem.where(stock_transfer_id: transfers.map(&:id)).group(:stock_transfer_id).count

        render_success(
          transfers: transfers.map { |t| serialize(t, items_count: item_counts[t.id].to_i) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/stock_transfers/:id
      def show
        render_success(transfer: serialize(@transfer, with_items: true))
      end

      # POST /api/v1/stock_transfers
      def create
        items = params[:items] || []
        return render_error("La transferencia debe tener al menos un producto", :unprocessable_entity) if items.empty?

        transfer = nil
        ActiveRecord::Base.transaction do
          transfer = StockTransfer.new(
            from_location_id: transfer_params[:from_location_id],
            to_location_id:   transfer_params[:to_location_id],
            requested_by:     current_rodauth_user,
            notes:            transfer_params[:notes]
          )
          transfer.save!

          items.each do |item|
            transfer.stock_transfer_items.create!(
              product_variant_id: item[:product_variant_id],
              quantity:           item[:quantity].to_i
            )
          end
        end

        render_success({ transfer: serialize(transfer.reload, with_items: true) }, "Transferencia creada correctamente")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo crear la transferencia", :unprocessable_entity, e.record.errors.full_messages)
      end

      # PUT /api/v1/stock_transfers/:id/receive
      def receive
        @transfer.receive!(current_rodauth_user)
        render_success({ transfer: serialize(@transfer.reload, with_items: true) }, "Transferencia confirmada — stock actualizado")
      rescue ActiveRecord::RecordInvalid => e
        render_error("No se pudo confirmar la transferencia", :unprocessable_entity, e.record.errors.full_messages)
      end

      # PUT /api/v1/stock_transfers/:id/cancel
      def cancel
        @transfer.cancel!
        render_success({ transfer: serialize(@transfer.reload, with_items: true) }, "Transferencia cancelada")
      end

      # DELETE /api/v1/stock_transfers/:id
      def destroy
        return render_error("Solo se pueden eliminar transferencias pendientes", :unprocessable_entity) unless @transfer.pending?

        @transfer.destroy!
        render_success({}, "Transferencia eliminada")
      end

      private

      def set_transfer
        @transfer = StockTransfer
                      .includes(:from_location, :to_location, :requested_by, :received_by,
                                stock_transfer_items: { product_variant: :product })
                      .find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Transferencia no encontrada", :not_found)
      end

      def transfer_params
        params.fetch(:transfer, {}).permit(:from_location_id, :to_location_id, :notes)
      end

      def search_params
        search = {}
        search[:status_eq]          = StockTransfer.statuses[params[:status]] if params[:status].present? && StockTransfer.statuses.key?(params[:status])
        search[:from_location_id_eq] = params[:from_location_id] if params[:from_location_id].present?
        search[:to_location_id_eq]   = params[:to_location_id]   if params[:to_location_id].present?
        search
      end

      def serialize(transfer, with_items: false, items_count: nil)
        data = {
          id:                  transfer.id,
          code:                transfer.code,
          status:              transfer.status,
          from_location_id:    transfer.from_location_id,
          from_location_name:  transfer.from_location&.name,
          to_location_id:      transfer.to_location_id,
          to_location_name:    transfer.to_location&.name,
          requested_by_id:     transfer.requested_by_id,
          requested_by_name:   transfer.requested_by&.fullname,
          received_by_id:      transfer.received_by_id,
          received_by_name:    transfer.received_by&.fullname,
          received_at:         transfer.received_at,
          notes:               transfer.notes,
          items_count:         items_count || (transfer.stock_transfer_items.loaded? ? transfer.stock_transfer_items.length : transfer.stock_transfer_items.count),
          created_at:          transfer.created_at
        }

        if with_items
          data[:items] = transfer.stock_transfer_items.map do |item|
            variant = item.product_variant
            {
              id:                 item.id,
              product_variant_id: item.product_variant_id,
              product_name:       variant.product.name,
              variant_label:      [variant.size, variant.color].compact.join(" / ").presence || variant.sku,
              sku:                variant.sku,
              quantity:           item.quantity
            }
          end
        end

        data
      end

      def clear_inventory_cache
        Rails.cache.delete("inventory:stats")
      end

      def pagination_data(pagy)
        {
          current_page: pagy.page,
          total_pages:  pagy.pages,
          total_count:  pagy.count,
          per_page:     pagy.limit
        }
      end
    end
  end
end
