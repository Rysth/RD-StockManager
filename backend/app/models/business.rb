class Business < ApplicationRecord
  has_one_attached :logo
  SRI_AMBIENTES = %w[1 2].freeze
  
  validates :name, presence: { message: "es requerido" }, length: { maximum: 100, message: "no puede tener más de 100 caracteres" }
  validates :slogan, length: { maximum: 200, message: "no puede tener más de 200 caracteres" }
  validates :whatsapp, format: { with: /\A\+?[1-9]\d{1,14}\z/, message: "debe ser un número de teléfono válido" }, allow_blank: true
  validates :instagram, format: { with: /\A[a-zA-Z0-9._]+\z/, message: "debe ser un nombre de usuario de Instagram válido" }, allow_blank: true
  validates :facebook, format: { with: /\A[a-zA-Z0-9.]+\z/, message: "debe ser un nombre de usuario de Facebook válido" }, allow_blank: true
  validates :tiktok, format: { with: /\A[a-zA-Z0-9._]+\z/, message: "debe ser un nombre de usuario de TikTok válido" }, allow_blank: true
  validates :ruc, format: { with: /\A\d{13}\z/, message: "debe tener 13 dígitos" }, allow_blank: true
  validates :sri_ambiente, inclusion: { in: SRI_AMBIENTES, message: "debe ser 1 (pruebas) o 2 (producción)" }

  # Indica si el negocio tiene todos los datos necesarios para emitir facturas electrónicas.
  def sri_ready?
    sri_enabled? && sri_issuer_ready? && sri_certificate_ready?
  end

  def sri_issuer_ready?
    ruc.present? && razon_social.present? && dir_matriz.present?
  end

  def sri_certificate_ready?
    sri_cert_file_present? && sri_cert_password_for_emission.present?
  end

  def sri_missing_requirements
    missing = []
    missing << "activa la facturación electrónica" unless sri_enabled?
    missing << "RUC" if ruc.blank?
    missing << "razón social" if razon_social.blank?
    missing << "dirección matriz" if dir_matriz.blank?
    missing << "certificado .p12" unless sri_cert_file_present?
    missing << "clave del certificado" if sri_cert_password_for_emission.blank?
    missing
  end

  def sri_ambiente_for_emission
    sri_ambiente.presence || ENV.fetch("SRI_AMBIENTE", "1")
  end

  def sri_cert_path_for_emission
    sri_cert_path.presence || ENV["SRI_CERT_PATH"]
  end

  def sri_cert_password_for_emission
    decrypted_sri_cert_password.presence || ENV["SRI_CERT_PASSWORD"]
  end

  def sri_cert_configured?
    sri_cert_file_present?
  end

  def sri_cert_file_present?
    path = sri_cert_path_for_emission
    path.present? && File.exist?(path)
  end

  def sri_cert_password=(value)
    return if value.blank?

    self.sri_cert_password_ciphertext = self.class.sri_encryptor.encrypt_and_sign(value.to_s)
  end

  validate :logo_size_validation
  validate :logo_type_validation
  
  # Sidekiq background job callbacks
  after_update :sync_storage_async, if: -> { logo.attached? }

  def self.current
    first || create(
      name: "EDLU Store",
      slogan: "Venta de gorras y calzados",
      whatsapp: "+593983236580",
      tiktok: "edlu_store_ec",
      email: "storeedlu@gmail.com",
      location: "Guayas-Guayaquil",
      instagram: "",
      facebook: ""
    )
  end


  def name_or_default
    name.present? ? name : "MenuChat"
  end

  def slogan_or_default
    slogan.present? ? slogan : "Powered by RysthDesign"
  end

  def self.sri_encryptor
    secret = Rails.application.secret_key_base
    key = ActiveSupport::KeyGenerator.new(secret).generate_key("business-sri-cert-password", 32)
    ActiveSupport::MessageEncryptor.new(key, cipher: "aes-256-gcm")
  end

  private

  def decrypted_sri_cert_password
    return if sri_cert_password_ciphertext.blank?

    self.class.sri_encryptor.decrypt_and_verify(sri_cert_password_ciphertext)
  rescue ActiveSupport::MessageEncryptor::InvalidMessage
    nil
  end

  def sync_storage_async
    BusinessProcessingJob.perform_later(self.id)
  end

  def logo_size_validation
    return unless logo.attached?
    if logo.blob.byte_size > 2.megabytes
      errors.add(:logo, "debe ser menor a 2MB")
    end
  end

  def logo_type_validation
    return unless logo.attached?
    acceptable_types = %w[image/jpeg image/jpg image/png image/webp]
    unless acceptable_types.include?(logo.blob.content_type)
      errors.add(:logo, "debe ser formato JPG, PNG o WEBP")
    end
  end
end
