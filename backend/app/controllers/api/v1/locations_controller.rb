module Api
  module V1
    class LocationsController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_LOCATIONS) }, only: [:index, :show]
      before_action -> { authorize_permission!(Permission::MANAGE_LOCATIONS) }, only: [:create, :update, :destroy]
      before_action :set_location, only: [:show, :update, :destroy]
      after_action :clear_inventory_cache, only: [:create, :update, :destroy]

      # GET /api/v1/locations
      def index
        @q = Location.ransack(search_params)
        @q.sorts = ["is_default desc", "name asc"] if @q.sorts.empty?

        @pagy, locations = pagy(@q.result, page: params[:page] || 1, limit: params[:per_page] || 50)
        locations = locations.to_a
        stock_totals = StockLevel.where(location_id: locations.map(&:id)).group(:location_id).sum(:quantity)

        render_success(
          locations: locations.map { |l| serialize(l, stock_total: stock_totals[l.id].to_i) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/locations/:id
      def show
        render_success(location: serialize(@location, stock_total: @location.stock_levels.sum(:quantity)))
      end

      # POST /api/v1/locations
      def create
        location = Location.new(location_params)

        if location.save
          render_success({ location: serialize(location) }, "Ubicación creada correctamente")
        else
          render_error("No se pudo crear la ubicación", :unprocessable_entity, location.errors.full_messages)
        end
      end

      # PUT /api/v1/locations/:id
      def update
        if @location.update(location_params)
          render_success({ location: serialize(@location) }, "Ubicación actualizada correctamente")
        else
          render_error("No se pudo actualizar la ubicación", :unprocessable_entity, @location.errors.full_messages)
        end
      end

      # DELETE /api/v1/locations/:id — archive (no physical delete, for traceability)
      def destroy
        if Location.active.where.not(id: @location.id).none?
          return render_error("No se puede archivar la única ubicación activa", :unprocessable_entity)
        end

        if @location.update(active: false, is_default: false)
          render_success({ location: serialize(@location) }, "Ubicación archivada correctamente")
        else
          render_error("No se pudo archivar la ubicación", :unprocessable_entity, @location.errors.full_messages)
        end
      end

      private

      def set_location
        @location = Location.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Ubicación no encontrada", :not_found)
      end

      def location_params
        params.require(:location).permit(:name, :address, :phone, :is_default, :active)
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

      def serialize(location, stock_total: nil)
        {
          id: location.id,
          code: location.code,
          name: location.name,
          address: location.address,
          phone: location.phone,
          is_default: location.is_default,
          active: location.active,
          stock_total: stock_total || location.stock_levels.sum(:quantity),
          created_at: location.created_at,
          updated_at: location.updated_at
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
