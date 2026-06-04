module Api
  module V1
    class ProductVariantsController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::MANAGE_PRODUCTS) }
      before_action :set_variant
      after_action :clear_inventory_cache

      # POST /api/v1/product_variants/:id/images  (multipart, images[])
      def images
        ProductImageStorageService.attach(@variant, params[:images], folder: "variants")
        render_success({ variant: serialize(@variant.reload) }, "Imágenes actualizadas")
      rescue ProductImageStorageService::InvalidImage => e
        render_error(e.message, :unprocessable_entity)
      end

      # DELETE /api/v1/product_variants/:id/images/:image_id
      def remove_image
        ProductImageStorageService.remove(@variant, params[:image_id])
        render_success({ variant: serialize(@variant.reload) }, "Imagen eliminada")
      end

      private

      def set_variant
        @variant = ProductVariant.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render_error("Variante no encontrada", :not_found)
      end

      def serialize(variant)
        {
          id: variant.id,
          product_id: variant.product_id,
          size: variant.size,
          color: variant.color,
          stock: variant.stock,
          sku: variant.sku,
          images: variant.images.map { |img| { id: img.id, url: url_for(img) } }
        }
      end

      def clear_inventory_cache
        Rails.cache.delete("inventory:stats")
      end
    end
  end
end
