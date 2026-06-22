require "openssl"

module Api
  module V1
    class BusinessesController < BaseController
      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_BUSINESS) }, only: [:current, :show]
      before_action -> { authorize_permission!(Permission::EDIT_BUSINESS) }, only: [:update]
      before_action :set_business, only: [:show, :update]
      after_action :clear_cache, only: [:update]

      # GET /api/v1/businesses/current
      def current
        cache_key = "business:current"
        business_data = Rails.cache.fetch(cache_key, expires_in: 5.minutes) do
          Rails.logger.info "CACHE MISS: Generating business data for #{cache_key}"
          @business = Business.current
          business_json(@business)
        end
        
        render json: business_data
      end

      # GET /api/v1/businesses/1
      def show
        render json: business_json(@business)
      end

      # PUT/PATCH /api/v1/businesses/1
      def update
        return render_error("Solo el administrador puede configurar la facturación SRI", :forbidden) if sri_admin_params_present? && !admin_user?

        update_params = business_params.except(:logo, :sri_certificate)
        update_params.merge!(sri_admin_params).merge!(plan_admin_params) if admin_user?

        if sri_certificate_password_update_present? && !valid_sri_certificate_password?(params[:sri_cert_password])
          return render_error("La clave del certificado .p12 no es válida", :unprocessable_entity)
        end

        if @business.update(update_params)
          if params[:logo].present?
            CloudflareBusinessStorageService.delete_business_logo(@business)
            CloudflareBusinessStorageService.attach_business_logo(@business, params[:logo])
          end

          return unless store_sri_certificate

          render json: business_json(@business)
        else
          render json: { errors: @business.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def set_business
        @business = params[:id] == 'current' ? Business.current : Business.find(params[:id])
      end

      def business_params
        params.slice(
          :name, :slogan, :whatsapp, :instagram, :facebook, :tiktok, :logo, :email, :location,
          :ruc, :razon_social, :dir_matriz, :dir_establecimiento, :obligado_contabilidad,
          :establecimiento, :punto_emision, :contribuyente_especial, :contribuyente_rimpe
        ).permit(
          :name, :slogan, :whatsapp, :instagram, :facebook, :tiktok, :logo, :email, :location,
          :ruc, :razon_social, :dir_matriz, :dir_establecimiento, :obligado_contabilidad,
          :establecimiento, :punto_emision, :contribuyente_especial, :contribuyente_rimpe
        )
      end

      def sri_admin_params
        params.slice(
          :sri_enabled, :sri_ambiente, :sri_cert_password, :sri_next_factura_secuencial
        ).permit(
          :sri_enabled, :sri_ambiente, :sri_cert_password, :sri_next_factura_secuencial
        )
      end

      # Campo del plan que solo el admin puede modificar. Si lo envía el dueño,
      # no se mergea (queda fuera de business_params) y se ignora silenciosamente.
      def plan_admin_params
        params.slice(:user_limit).permit(:user_limit)
      end

      def sri_admin_params_present?
        params.key?(:sri_enabled) || params.key?(:sri_ambiente) || params.key?(:sri_certificate) ||
          params.key?(:sri_cert_password) || params.key?(:sri_next_factura_secuencial)
      end

      def sri_certificate_password_update_present?
        params[:sri_cert_password].present? && (params[:sri_certificate].present? || @business.sri_cert_file_present?)
      end

      def valid_sri_certificate_password?(password)
        if params[:sri_certificate].present?
          params[:sri_certificate].tempfile.rewind
          bytes = params[:sri_certificate].tempfile.read
          params[:sri_certificate].tempfile.rewind
        elsif @business.sri_cert_path_for_emission.present?
          bytes = File.binread(@business.sri_cert_path_for_emission)
        end

        return true if bytes.blank?

        SriFacturacion::Signer.load_legacy_provider if defined?(SriFacturacion::Signer)
        OpenSSL::PKCS12.new(bytes, password.to_s)
        true
      rescue OpenSSL::PKCS12::PKCS12Error => e
        Rails.logger.warn("[BusinessesController] Clave .p12 inválida: #{e.message}")
        false
      rescue StandardError => e
        Rails.logger.warn("[BusinessesController] No se pudo validar clave .p12: #{e.class} #{e.message}")
        false
      end

      def admin_user?
        current_rodauth_user&.has_role?(:admin)
      end

      def store_sri_certificate
        certificate = params[:sri_certificate]
        return true unless certificate.present?

        filename = certificate.original_filename.to_s
        extension = File.extname(filename).downcase
        unless %w[.p12 .pfx].include?(extension)
          render_error("El certificado debe ser un archivo .p12 o .pfx", :unprocessable_entity)
          return false
        end

        if certificate.size > 2.megabytes
          render_error("El certificado debe ser menor a 2MB", :unprocessable_entity)
          return false
        end

        if params[:sri_cert_password].blank? && @business.sri_cert_password_for_emission.blank?
          render_error("Ingresa la clave del certificado para guardar el .p12", :unprocessable_entity)
          return false
        end

        previous_path = @business.sri_cert_path

        @business.sri_certificate.attach(
          io: certificate.tempfile,
          filename: filename,
          content_type: "application/x-pkcs12"
        )

        @business.update!(
          sri_cert_path: nil,
          sri_cert_filename: filename,
          sri_cert_uploaded_at: Time.current
        )
        delete_previous_sri_certificate(previous_path)
        true
      end

      def delete_previous_sri_certificate(path)
        return if path.blank?

        cert_dir = File.expand_path(Rails.root.join("storage", "sri_certs").to_s) + File::SEPARATOR
        absolute_path = File.expand_path(path)
        return unless absolute_path.start_with?(cert_dir) && File.exist?(absolute_path)

        File.delete(absolute_path)
      rescue StandardError => e
        Rails.logger.warn("[BusinessesController] No se pudo eliminar certificado SRI anterior: #{e.class} #{e.message}")
      end

      def business_json(business)
        {
          id: business.id,
          name: business.name,
          slogan: business.slogan_or_default,
          logo_url: business.logo.attached? ? url_for(business.logo) : "",
          whatsapp: business.whatsapp,
          instagram: business.instagram,
          facebook: business.facebook,
          tiktok: business.tiktok,
          email: business.email,
          location: business.location,
          ruc: business.ruc,
          razon_social: business.razon_social,
          dir_matriz: business.dir_matriz,
          dir_establecimiento: business.dir_establecimiento,
          obligado_contabilidad: business.obligado_contabilidad,
          establecimiento: business.establecimiento,
          punto_emision: business.punto_emision,
          contribuyente_especial: business.contribuyente_especial,
          contribuyente_rimpe: business.contribuyente_rimpe,
          sri_enabled: business.sri_enabled,
          sri_ambiente: business.sri_ambiente_for_emission,
          sri_next_factura_secuencial: business.sri_next_factura_secuencial,
          sri_ready: business.sri_ready?,
          sri_missing_requirements: business.sri_missing_requirements,
          sri_cert_configured: business.sri_cert_configured?,
          sri_cert_filename: business.sri_cert_filename,
          sri_cert_uploaded_at: business.sri_cert_uploaded_at,
          user_limit: business.user_limit,
          user_limit_used: User.business_seats_used,
          created_at: business.created_at,
          updated_at: business.updated_at
        }
      end

      def clear_cache
        Rails.cache.delete("business:current")
        Rails.cache.delete("public:business:current")
        # El indicador "X de N usuarios" de la página de usuarios depende del límite,
        # así que invalidamos su cache cuando el admin cambia el plan.
        Rails.cache.delete_matched("users:index*")
      end
    end
  end
end
