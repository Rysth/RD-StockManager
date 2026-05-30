module Api
  module V1
    class CustomersController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_CUSTOMERS) }
      before_action :set_customer, only: [:show, :update, :destroy]

      # GET /api/v1/customers
      def index
        @q = Customer.ransack(search_params)
        @q.sorts = "name asc" if @q.sorts.empty?

        @pagy, customers = pagy(@q.result, page: params[:page] || 1, limit: params[:per_page] || 12)

        render_success(
          customers: customers.map { |c| serialize(c) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/customers/:id
      def show
        render_success(customer: serialize(@customer))
      end

      # POST /api/v1/customers
      def create
        customer = Customer.new(customer_params)

        if customer.save
          render_success({ customer: serialize(customer) }, "Cliente creado correctamente")
        else
          render_error("No se pudo crear el cliente", :unprocessable_entity, customer.errors.full_messages)
        end
      end

      # PUT /api/v1/customers/:id
      def update
        if @customer.update(customer_params)
          render_success({ customer: serialize(@customer) }, "Cliente actualizado correctamente")
        else
          render_error("No se pudo actualizar el cliente", :unprocessable_entity, @customer.errors.full_messages)
        end
      end

      # DELETE /api/v1/customers/:id
      def destroy
        if @customer.destroy
          render_success({}, "Cliente eliminado correctamente")
        else
          render_error("No se pudo eliminar el cliente", :unprocessable_entity, @customer.errors.full_messages)
        end
      end

      private

      def set_customer
        @customer = Customer.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Cliente no encontrado", :not_found)
      end

      def customer_params
        params.require(:customer).permit(:name, :phone, :city, :id_type, :id_number, :country, :address)
      end

      def search_params
        search = {}
        search[:name_or_phone_cont] = params[:search] if params[:search].present?
        search
      end

      def serialize(customer)
        {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          city: customer.city,
          id_type: customer.id_type,
          id_number: customer.id_number,
          country: customer.country,
          address: customer.address,
          sales_count: customer.sales.size,
          created_at: customer.created_at,
          updated_at: customer.updated_at
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
