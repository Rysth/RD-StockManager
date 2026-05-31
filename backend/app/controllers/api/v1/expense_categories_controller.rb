module Api
  module V1
    class ExpenseCategoriesController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_EXPENSES) }, except: [:index]
      before_action -> { authorize_permission!(Permission::VIEW_EXPENSES) }, only: [:index]
      before_action :set_category, only: [:update, :destroy]

      # GET /api/v1/expense_categories
      def index
        scope = params[:archived].to_s == "true" ? ExpenseCategory.all : ExpenseCategory.active
        categories = scope.order(:name)
        render_success(expense_categories: categories.map { |c| serialize(c) })
      end

      # POST /api/v1/expense_categories
      def create
        category = ExpenseCategory.new(category_params)
        if category.save
          render_success({ expense_category: serialize(category) }, "Categoría creada correctamente")
        else
          render_error("No se pudo crear la categoría", :unprocessable_entity, category.errors.full_messages)
        end
      end

      # PUT /api/v1/expense_categories/:id
      def update
        if @category.update(category_params)
          render_success({ expense_category: serialize(@category) }, "Categoría actualizada correctamente")
        else
          render_error("No se pudo actualizar la categoría", :unprocessable_entity, @category.errors.full_messages)
        end
      end

      # DELETE /api/v1/expense_categories/:id — archiva (no borra)
      def destroy
        if @category.update(active: false)
          render_success({ expense_category: serialize(@category) }, "Categoría archivada correctamente")
        else
          render_error("No se pudo archivar la categoría", :unprocessable_entity, @category.errors.full_messages)
        end
      end

      private

      def set_category
        @category = ExpenseCategory.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Categoría no encontrada", :not_found)
      end

      def category_params
        params.require(:expense_category).permit(:name, :active)
      end

      def serialize(category)
        {
          id: category.id,
          name: category.name,
          active: category.active,
          created_at: category.created_at,
          updated_at: category.updated_at
        }
      end
    end
  end
end
