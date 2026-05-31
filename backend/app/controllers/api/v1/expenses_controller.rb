module Api
  module V1
    class ExpensesController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_EXPENSES) }, except: [:index, :show]
      before_action -> { authorize_permission!(Permission::VIEW_EXPENSES) }, only: [:index, :show]
      before_action :set_expense, only: [:show, :update, :destroy]

      # GET /api/v1/expenses
      def index
        @q = Expense.includes(:expense_category, :location, :user).ransack(search_params)
        @q.sorts = "expense_date desc" if @q.sorts.empty?

        @pagy, expenses = pagy(@q.result, page: params[:page] || 1, limit: params[:per_page] || 12)

        render_success(
          expenses: expenses.map { |e| serialize(e) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/expenses/:id
      def show
        render_success(expense: serialize(@expense))
      end

      # POST /api/v1/expenses
      def create
        expense = Expense.new(expense_params)
        expense.user = current_rodauth_user

        if expense.save
          render_success({ expense: serialize(expense) }, "Gasto registrado correctamente")
        else
          render_error("No se pudo registrar el gasto", :unprocessable_entity, expense.errors.full_messages)
        end
      end

      # PUT /api/v1/expenses/:id
      def update
        if @expense.update(expense_params)
          render_success({ expense: serialize(@expense) }, "Gasto actualizado correctamente")
        else
          render_error("No se pudo actualizar el gasto", :unprocessable_entity, @expense.errors.full_messages)
        end
      end

      # DELETE /api/v1/expenses/:id
      def destroy
        @expense.destroy
        render_success({}, "Gasto eliminado correctamente")
      end

      private

      def set_expense
        @expense = Expense.includes(:expense_category, :location, :user).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Gasto no encontrado", :not_found)
      end

      def expense_params
        params.require(:expense).permit(:expense_category_id, :location_id, :amount, :expense_date, :description, :payment_method, :reference)
      end

      def search_params
        search = {}
        search[:description_cont] = params[:search] if params[:search].present?
        search[:expense_category_id_eq] = params[:expense_category_id] if params[:expense_category_id].present?
        search[:location_id_eq] = params[:location_id] if params[:location_id].present?
        search
      end

      def serialize(expense)
        {
          id: expense.id,
          amount: expense.amount,
          expense_date: expense.expense_date,
          description: expense.description,
          payment_method: expense.payment_method,
          reference: expense.reference,
          expense_category_id: expense.expense_category_id,
          category_name: expense.expense_category&.name,
          location_id: expense.location_id,
          location_name: expense.location&.name,
          created_by: expense.user&.fullname,
          created_at: expense.created_at,
          updated_at: expense.updated_at
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
