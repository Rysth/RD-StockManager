require "fileutils"

class Business < ApplicationRecord
  has_one_attached :logo
  has_one_attached :sri_certificate
  SRI_AMBIENTES = %w[1 2].freeze
  
  validates :name, presence: { message: "es requerido" }, length: { maximum: 100, message: "no puede tener más de 100 caracteres" }
  validates :slogan, length: { maximum: 200, message: "no puede tener más de 200 caracteres" }
  validates :whatsapp, format: { with: /\A\+?[1-9]\d{1,14}\z/, message: "debe ser un número de teléfono válido" }, allow_blank: true
  validates :instagram, format: { with: /\A[a-zA-Z0-9._]+\z/, message: "debe ser un nombre de usuario de Instagram válido" }, allow_blank: true
  validates :facebook, format: { with: /\A[a-zA-Z0-9.]+\z/, message: "debe ser un nombre de usuario de Facebook válido" }, allow_blank: true
  validates :tiktok, format: { with: /\A[a-zA-Z0-9._]+\z/, message: "debe ser un nombre de usuario de TikTok válido" }, allow_blank: true
  validates :ruc, format: { with: /\A\d{13}\z/, message: "debe tener 13 dígitos" }, allow_blank: true
  validates :sri_ambiente, inclusion: { in: SRI_AMBIENTES, message: "debe ser 1 (pruebas) o 2 (producción)" }
  validates :sri_next_factura_secuencial,
            numericality: { only_integer: true, greater_than_or_equal_to: 1 }
  validates :user_limit,
            numericality: { only_integer: true, greater_than_or_equal_to: 1 }

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
    sri_ambiente.presence || "1"
  end

  def sri_cert_path_for_emission
    return sri_cert_path if sri_cert_path.present? && File.exist?(sri_cert_path)
    return unless sri_certificate.attached?

    cache_sri_certificate_for_emission
  end

  def sri_cert_password_for_emission
    decrypted_sri_cert_password.presence
  end

  def sri_cert_configured?
    sri_cert_file_present?
  end

  def sri_cert_file_present?
    sri_certificate.attached? || (sri_cert_path.present? && File.exist?(sri_cert_path))
  end

  def sri_cert_password=(value)
    return if value.blank?

    self.sri_cert_password_ciphertext = self.class.sri_encryptor.encrypt_and_sign(value.to_s)
  end

  validate :logo_size_validation
  validate :logo_type_validation
  
  # Sidekiq background job callbacks
  after_update :sync_storage_async, if: -> { logo.attached? }

  # Negocio singleton del despliegue. Los valores por defecto se toman de
  # variables de entorno para que cada cliente (cada branch/despliegue) configure
  # su identidad sin editar código. Tras el primer arranque se administran desde
  # el panel. Ver BUSINESS_* en el entorno de despliegue.
  def self.current
    first || create(
      name: ENV.fetch("BUSINESS_NAME", "EDLU Store"),
      slogan: ENV.fetch("BUSINESS_SLOGAN", "Venta de gorras y calzados"),
      whatsapp: ENV.fetch("BUSINESS_WHATSAPP", "+593983236580"),
      tiktok: ENV.fetch("BUSINESS_TIKTOK", "edlu_store_ec"),
      email: ENV.fetch("BUSINESS_EMAIL", "storeedlu@gmail.com"),
      location: ENV.fetch("BUSINESS_LOCATION", "Guayas-Guayaquil"),
      instagram: ENV.fetch("BUSINESS_INSTAGRAM", ""),
      facebook: ENV.fetch("BUSINESS_FACEBOOK", "")
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

  def cache_sri_certificate_for_emission
    FileUtils.mkdir_p(sri_certificate_cache_dir)
    path = sri_certificate_cache_dir.join("business-#{id}-#{sri_certificate.blob.key}#{sri_certificate_extension}")
    return path.to_s if File.exist?(path)

    File.binwrite(path, sri_certificate.download)
    File.chmod(0o600, path)
    path.to_s
  end

  def sri_certificate_cache_dir
    Rails.root.join("tmp", "sri_certs")
  end

  def sri_certificate_extension
    extension = File.extname(sri_certificate.filename.to_s).downcase
    %w[.p12 .pfx].include?(extension) ? extension : ".p12"
  end

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
