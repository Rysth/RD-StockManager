module Api
  module V1
    class ProductBundlesController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_INVENTORY) }, only: [:index, :show]
      before_action -> { authorize_permission!(Permission::MANAGE_PRODUCTS) }, only: [:create, :update, :destroy]
      before_action :set_bundle, only: [:show, :update, :destroy]
      after_action :clear_inventory_cache, only: [:create, :update, :destroy]

      def index
        bundles = ProductBundle.includes(product_bundle_items: { product_variant: :product })
        bundles = bundles.active unless params[:active].to_s == "false"
        bundles = bundles.order(:name)
        location = params[:location_id].present? ? Location.find_by(id: params[:location_id]) : Location.default

        render_success(bundles: bundles.map { |bundle| serialize(bundle, location: location) })
      end

      def show
        render_success(bundle: serialize(@bundle, location: Location.default))
      end

      def create
        bundle = ProductBundle.new(bundle_params)
        if bundle.save
          render_success({ bundle: serialize(bundle, location: Location.default) }, "Combo creado correctamente")
        else
          render_error("No se pudo crear el combo", :unprocessable_entity, bundle.errors.full_messages)
        end
      end

      def update
        if @bundle.update(bundle_params)
          render_success({ bundle: serialize(@bundle, location: Location.default) }, "Combo actualizado correctamente")
        else
          render_error("No se pudo actualizar el combo", :unprocessable_entity, @bundle.errors.full_messages)
        end
      end

      def destroy
        if @bundle.update(active: false)
          render_success({ bundle: serialize(@bundle, location: Location.default) }, "Combo archivado correctamente")
        else
          render_error("No se pudo archivar el combo", :unprocessable_entity, @bundle.errors.full_messages)
        end
      end

      private

      def set_bundle
        @bundle = ProductBundle.includes(product_bundle_items: { product_variant: :product }).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Combo no encontrado", :not_found)
      end

      def bundle_params
        params.require(:product_bundle).permit(
          :name, :description, :base_price, :active,
          product_bundle_items_attributes: [:id, :product_variant_id, :quantity, :_destroy]
        )
      end

      def serialize(bundle, location: nil)
        {
          id: bundle.id,
          name: bundle.name,
          description: bundle.description,
          base_price: bundle.base_price,
          total_cost: bundle.total_cost,
          available_stock: bundle.stock_for(location || Location.default),
          active: bundle.active,
          items_count: bundle.product_bundle_items.length,
          items: bundle.product_bundle_items.map do |item|
            variant = item.product_variant
            product = variant.product
            {
              id: item.id,
              product_variant_id: variant.id,
              product_name: product.name,
              variant_label: [variant.size, variant.color].filter(&:present?).join(" / ").presence || variant.sku,
              sku: variant.sku,
              quantity: item.quantity,
              unit_cost: product.cost
            }
          end,
          created_at: bundle.created_at,
          updated_at: bundle.updated_at
        }
      end

      def clear_inventory_cache
        Rails.cache.delete("inventory:stats")
      end
    end
  end
end
