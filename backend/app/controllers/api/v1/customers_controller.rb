module Api
  module V1
    class CustomersController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_CUSTOMERS) }
      before_action :set_customer, only: [:show, :update, :destroy]
      after_action :clear_inventory_cache, only: [:create, :update, :destroy]

      # GET /api/v1/customers
      def index
        @q = Customer.ransack(search_params)
        @q.sorts = "name asc" if @q.sorts.empty?

        @pagy, customers = pagy(@q.result, page: params[:page] || 1, limit: params[:per_page] || 12)
        customers = customers.to_a
        sales_counts = Sale.where(customer_id: customers.map(&:id)).group(:customer_id).count

        render_success(
          customers: customers.map { |c| serialize(c, sales_count: sales_counts[c.id].to_i) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/customers/:id
      def show
        render_success(customer: serialize(@customer, sales_count: @customer.sales.count))
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

      # DELETE /api/v1/customers/:id — archive (no physical delete, for traceability)
      def destroy
        if @customer.update(active: false)
          render_success({ customer: serialize(@customer) }, "Cliente archivado correctamente")
        else
          render_error("No se pudo archivar el cliente", :unprocessable_entity, @customer.errors.full_messages)
        end
      end

      private

      def set_customer
        @customer = Customer.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Cliente no encontrado", :not_found)
      end

      def customer_params
        params.require(:customer).permit(
          :name, :phone, :city, :id_type, :id_number, :country, :address, :active,
          :email, :is_customer, :is_supplier, :credit_limit, :payment_term_days
        )
      end

      def search_params
        search = {}
        search[:name_or_phone_cont] = params[:search] if params[:search].present?
        case params[:role]
        when "customer" then search[:is_customer_eq] = true
        when "supplier" then search[:is_supplier_eq] = true
        end
        if params[:active].present?
          search[:active_eq] = params[:active]
        elsif params[:archived].to_s == "true"
          search[:active_eq] = false
        else
          search[:active_eq] = true
        end
        search
      end

      def serialize(customer, sales_count: nil)
        {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          city: customer.city,
          id_type: customer.id_type,
          id_number: customer.id_number,
          country: customer.country,
          address: customer.address,
          email: customer.email,
          is_customer: customer.is_customer,
          is_supplier: customer.is_supplier,
          credit_limit: customer.credit_limit,
          payment_term_days: customer.payment_term_days,
          receivable: customer.receivable,
          payable: customer.payable,
          active: customer.active,
          sales_count: sales_count || customer.sales.count,
          created_at: customer.created_at,
          updated_at: customer.updated_at
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
