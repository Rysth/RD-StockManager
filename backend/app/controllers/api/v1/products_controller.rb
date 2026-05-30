module Api
  module V1
    class ProductsController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_INVENTORY) }, only: [:index, :show, :low_stock]
      before_action -> { authorize_permission!(Permission::MANAGE_PRODUCTS) }, only: [:create, :update, :destroy, :images, :remove_image]
      before_action :set_product, only: [:show, :update, :destroy, :images, :remove_image]
      after_action :clear_inventory_cache, only: [:create, :update, :destroy, :images, :remove_image]

      # GET /api/v1/products
      def index
        @q = Product.includes(:category, product_variants: { images_attachments: :blob }, images_attachments: :blob).ransack(search_params)
        @q.sorts = "name asc" if @q.sorts.empty?

        @pagy, products = pagy(@q.result(distinct: true), page: params[:page] || 1, limit: params[:per_page] || 12)

        render_success(
          products: products.map { |p| serialize(p) },
          pagination: pagination_data(@pagy)
        )
      end

      # GET /api/v1/products/:id
      def show
        render_success(product: serialize(@product))
      end

      # GET /api/v1/products/low_stock
      def low_stock
        variants = ProductVariant.includes(product: :category)
                                 .where("stock <= ?", ProductVariant::LOW_STOCK_THRESHOLD)
                                 .order(:stock)

        render_success(
          variants: variants.map do |v|
            {
              id: v.id,
              sku: v.sku,
              size: v.size,
              color: v.color,
              stock: v.stock,
              product_id: v.product_id,
              product_name: v.product.name,
              brand: v.product.brand,
              category: v.product.category&.name
            }
          end
        )
      end

      # POST /api/v1/products
      def create
        product = Product.new(product_params)

        if product.save
          render_success({ product: serialize(product) }, "Producto creado correctamente")
        else
          render_error("No se pudo crear el producto", :unprocessable_entity, product.errors.full_messages)
        end
      end

      # PUT /api/v1/products/:id
      def update
        if @product.update(product_params)
          render_success({ product: serialize(@product) }, "Producto actualizado correctamente")
        else
          render_error("No se pudo actualizar el producto", :unprocessable_entity, @product.errors.full_messages)
        end
      end

      # DELETE /api/v1/products/:id
      def destroy
        if @product.destroy
          render_success({}, "Producto eliminado correctamente")
        else
          render_error("No se pudo eliminar el producto", :unprocessable_entity, @product.errors.full_messages)
        end
      end

      # POST /api/v1/products/:id/images  (multipart, images[])
      def images
        ProductImageStorageService.attach(@product, params[:images], folder: "products")
        render_success({ product: serialize(@product.reload) }, "Imágenes actualizadas")
      end

      # DELETE /api/v1/products/:id/images/:image_id
      def remove_image
        ProductImageStorageService.remove(@product, params[:image_id])
        render_success({ product: serialize(@product.reload) }, "Imagen eliminada")
      end

      private

      def clear_inventory_cache
        Rails.cache.delete("inventory:stats")
      end

      def set_product
        @product = Product.includes(:category, product_variants: { images_attachments: :blob }, images_attachments: :blob).find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Producto no encontrado", :not_found)
      end

      def product_params
        params.require(:product).permit(
          :name, :brand, :base_price, :cost, :wholesale_price, :wholesale_min_quantity,
          :description, :active, :category_id,
          product_variants_attributes: [:id, :size, :color, :stock, :sku, :_destroy]
        )
      end

      def search_params
        search = {}
        search[:name_or_brand_cont] = params[:search] if params[:search].present?
        search[:category_id_eq] = params[:category_id] if params[:category_id].present?
        search[:active_eq] = params[:active] if params[:active].present?
        search
      end

      def serialize(product)
        {
          id: product.id,
          name: product.name,
          brand: product.brand,
          base_price: product.base_price,
          cost: product.cost,
          wholesale_price: product.wholesale_price,
          wholesale_min_quantity: product.wholesale_min_quantity,
          description: product.description,
          active: product.active,
          category_id: product.category_id,
          category: product.category&.name,
          total_stock: product.product_variants.sum(&:stock),
          images: image_list(product),
          variants: product.product_variants.map do |v|
            {
              id: v.id,
              size: v.size,
              color: v.color,
              stock: v.stock,
              sku: v.sku,
              low_stock: v.low_stock?,
              out_of_stock: v.out_of_stock?,
              images: image_list(v)
            }
          end,
          created_at: product.created_at,
          updated_at: product.updated_at
        }
      end

      def image_list(record)
        record.images.map { |img| { id: img.id, url: url_for(img) } }
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
