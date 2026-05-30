module Api
  module V1
    class InventoryController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_INVENTORY) }

      # GET /api/v1/inventory/stats
      def stats
        data = Rails.cache.fetch("inventory:stats", expires_in: 2.minutes) do
          build_stats
        end

        render_success(data)
      end

      private

      def build_stats
        now = Time.current

        {
          stats: {
            total_products: Product.count,
            active_products: Product.active.count,
            total_variants: ProductVariant.count,
            low_stock_count: ProductVariant.low_stock.count,
            out_of_stock_count: ProductVariant.out_of_stock.count,
            total_customers: Customer.count,
            total_categories: Category.count,
            revenue_today: Sale.completed.where(sold_at: now.beginning_of_day..now).sum(:total),
            sales_today: Sale.completed.where(sold_at: now.beginning_of_day..now).count
          }
        }
      end
    end
  end
end
