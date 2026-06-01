module Api
  module V1
    class CategoriesController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_INVENTORY) }, only: [:index, :show]
      before_action -> { authorize_permission!(Permission::MANAGE_PRODUCTS) }, only: [:create, :update, :destroy]
      before_action :set_category, only: [:show, :update, :destroy]
      after_action :clear_inventory_cache, only: [:create, :update, :destroy]

      # GET /api/v1/categories
      def index
        @q = Category.includes(:parent).ransack(search_params)
        @q.sorts = "name asc" if @q.sorts.empty?

        @pagy, categories = pagy(@q.result, page: params[:page] || 1, limit: params[:per_page] || 50)
        categories = categories.to_a
        product_counts = Product.where(category_id: categories.map(&:id)).group(:category_id).count

        render_success(
          categories: categories.map { |c| serialize(c, products_count: product_counts[c.id].to_i) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/categories/:id
      def show
        render_success(category: serialize(@category, products_count: @category.products.count))
      end

      # POST /api/v1/categories
      def create
        category = Category.new(category_params)

        if category.save
          render_success({ category: serialize(category) }, "Categoría creada correctamente")
        else
          render_error("No se pudo crear la categoría", :unprocessable_entity, category.errors.full_messages)
        end
      end

      # PUT /api/v1/categories/:id
      def update
        if @category.update(category_params)
          render_success({ category: serialize(@category) }, "Categoría actualizada correctamente")
        else
          render_error("No se pudo actualizar la categoría", :unprocessable_entity, @category.errors.full_messages)
        end
      end

      # DELETE /api/v1/categories/:id — archive (no physical delete, for traceability)
      def destroy
        if @category.update(active: false)
          render_success({ category: serialize(@category) }, "Categoría archivada correctamente")
        else
          render_error("No se pudo archivar la categoría", :unprocessable_entity, @category.errors.full_messages)
        end
      end

      private

      def set_category
        @category = Category.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Categoría no encontrada", :not_found)
      end

      def category_params
        params.require(:category).permit(:name, :description, :active, :parent_id)
      end

      def search_params
        search = {}
        search[:name_cont] = params[:search] if params[:search].present?
        if params[:active].present?
          search[:active_eq] = params[:active]
        elsif params[:archived].to_s == "true"
          search[:active_eq] = false
        else
          search[:active_eq] = true
        end
        search
      end

      def serialize(category, products_count: nil)
        {
          id: category.id,
          name: category.name,
          description: category.description,
          active: category.active,
          parent_id: category.parent_id,
          parent_name: category.parent&.name,
          products_count: products_count || category.products.count,
          created_at: category.created_at,
          updated_at: category.updated_at
        }
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
