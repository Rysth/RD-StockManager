module Api
  module V1
    class BrandsController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_INVENTORY) }, only: [:index, :show]
      before_action -> { authorize_permission!(Permission::MANAGE_PRODUCTS) }, only: [:create, :update, :destroy]
      before_action :set_brand, only: [:show, :update, :destroy]
      after_action :clear_inventory_cache, only: [:create, :update, :destroy]

      # GET /api/v1/brands
      def index
        @q = Brand.ransack(search_params)
        @q.sorts = "name asc" if @q.sorts.empty?

        @pagy, brands = pagy(@q.result, page: params[:page] || 1, limit: params[:per_page] || 50)
        brands = brands.to_a
        product_counts = Product.where(brand_id: brands.map(&:id)).group(:brand_id).count

        render_success(
          brands: brands.map { |b| serialize(b, products_count: product_counts[b.id].to_i) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/brands/:id
      def show
        render_success(brand: serialize(@brand, products_count: @brand.products.count))
      end

      # POST /api/v1/brands
      def create
        brand = Brand.new(brand_params)

        if brand.save
          render_success({ brand: serialize(brand) }, "Marca creada correctamente")
        else
          render_error("No se pudo crear la marca", :unprocessable_entity, brand.errors.full_messages)
        end
      end

      # PUT /api/v1/brands/:id
      def update
        if @brand.update(brand_params)
          render_success({ brand: serialize(@brand) }, "Marca actualizada correctamente")
        else
          render_error("No se pudo actualizar la marca", :unprocessable_entity, @brand.errors.full_messages)
        end
      end

      # DELETE /api/v1/brands/:id — archive (no physical delete, for traceability)
      def destroy
        if @brand.update(active: false)
          render_success({ brand: serialize(@brand) }, "Marca archivada correctamente")
        else
          render_error("No se pudo archivar la marca", :unprocessable_entity, @brand.errors.full_messages)
        end
      end

      private

      def set_brand
        @brand = Brand.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Marca no encontrada", :not_found)
      end

      def brand_params
        params.require(:brand).permit(:name, :description, :active)
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

      def serialize(brand, products_count: nil)
        {
          id: brand.id,
          name: brand.name,
          description: brand.description,
          active: brand.active,
          products_count: products_count || brand.products.count,
          created_at: brand.created_at,
          updated_at: brand.updated_at
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
