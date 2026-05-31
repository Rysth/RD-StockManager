module Api
  module V1
    class InventoryController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_INVENTORY) }

      # GET /api/v1/inventory/stats  (optional ?location_id= to scope to one location)
      def stats
        location_id = params[:location_id].presence

        # Per-location stats aren't cached (low traffic admin views); global stats are.
        data = if location_id
                 build_stats(location_id)
               else
                 Rails.cache.fetch("inventory:stats", expires_in: 2.minutes) { build_stats }
               end

        render_success(data)
      end

      private

      def build_stats(location_id = nil)
        now = Time.current

        if location_id
          low_stock_count = ProductVariant.low_stock_at(location_id).distinct.count
          out_of_stock_count = ProductVariant.joins(:stock_levels)
                                             .where(stock_levels: { location_id: location_id, quantity: 0 })
                                             .distinct.count
          sales_scope = Sale.completed.where(location_id: location_id)
        else
          low_stock_count = ProductVariant.low_stock.count
          out_of_stock_count = ProductVariant.out_of_stock.count
          sales_scope = Sale.completed
        end

        {
          stats: {
            total_products: Product.count,
            active_products: Product.active.count,
            total_variants: ProductVariant.count,
            low_stock_count: low_stock_count,
            out_of_stock_count: out_of_stock_count,
            total_customers: Customer.count,
            total_categories: Category.count,
            revenue_today: sales_scope.where(sold_at: now.beginning_of_day..now).sum(:total),
            sales_today: sales_scope.where(sold_at: now.beginning_of_day..now).count
          }
        }
      end
    end
  end
end
