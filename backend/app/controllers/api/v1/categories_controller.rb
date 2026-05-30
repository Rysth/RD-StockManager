module Api
  module V1
    class CategoriesController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_INVENTORY) }, only: [:index, :show]
      before_action -> { authorize_permission!(Permission::MANAGE_PRODUCTS) }, only: [:create, :update, :destroy]
      before_action :set_category, only: [:show, :update, :destroy]

      # GET /api/v1/categories
      def index
        @q = Category.ransack(search_params)
        @q.sorts = "name asc" if @q.sorts.empty?

        @pagy, categories = pagy(@q.result, page: params[:page] || 1, limit: params[:per_page] || 50)

        render_success(
          categories: categories.map { |c| serialize(c) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/categories/:id
      def show
        render_success(category: serialize(@category))
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

      # DELETE /api/v1/categories/:id
      def destroy
        if @category.destroy
          render_success({}, "Categoría eliminada correctamente")
        else
          render_error("No se pudo eliminar la categoría", :unprocessable_entity, @category.errors.full_messages)
        end
      end

      private

      def set_category
        @category = Category.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Categoría no encontrada", :not_found)
      end

      def category_params
        params.require(:category).permit(:name, :description, :active)
      end

      def search_params
        search = {}
        search[:name_cont] = params[:search] if params[:search].present?
        search[:active_eq] = params[:active] if params[:active].present?
        search
      end

      def serialize(category)
        {
          id: category.id,
          name: category.name,
          description: category.description,
          active: category.active,
          products_count: category.products.size,
          created_at: category.created_at,
          updated_at: category.updated_at
        }
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
