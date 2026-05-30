class Business < ApplicationRecord
  has_one_attached :logo
  
  validates :name, presence: { message: "es requerido" }, length: { maximum: 100, message: "no puede tener más de 100 caracteres" }
  validates :slogan, length: { maximum: 200, message: "no puede tener más de 200 caracteres" }
  validates :whatsapp, format: { with: /\A\+?[1-9]\d{1,14}\z/, message: "debe ser un número de teléfono válido" }, allow_blank: true
  validates :instagram, format: { with: /\A[a-zA-Z0-9._]+\z/, message: "debe ser un nombre de usuario de Instagram válido" }, allow_blank: true
  validates :facebook, format: { with: /\A[a-zA-Z0-9.]+\z/, message: "debe ser un nombre de usuario de Facebook válido" }, allow_blank: true
  validates :tiktok, format: { with: /\A[a-zA-Z0-9._]+\z/, message: "debe ser un nombre de usuario de TikTok válido" }, allow_blank: true
  
  validate :logo_size_validation
  validate :logo_type_validation
  
  # Sidekiq background job callbacks
  after_update :sync_storage_async, if: -> { logo.attached? }

  def self.current
    first || create(
      name: "MicroBiz",
      slogan: "Powered by RysthDesign",
      whatsapp: "",
      instagram: "",
      facebook: "",
      tiktok: ""
    )
  end


  def name_or_default
    name.present? ? name : "MenuChat"
  end

  def slogan_or_default
    slogan.present? ? slogan : "Powered by RysthDesign"
  end

  private

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