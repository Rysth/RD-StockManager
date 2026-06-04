class Product < ApplicationRecord
  MAX_IMAGES = 3
  MAX_IMAGE_SIZE = 5.megabytes
  PRODUCT_TYPES = %w[good service].freeze

  audited

  belongs_to :category
  belongs_to :brand, optional: true
  has_many :product_variants, dependent: :destroy
  has_many_attached :images

  accepts_nested_attributes_for :product_variants, allow_destroy: true

  before_validation :ensure_base_variant

  validates :name, presence: { message: "El nombre es requerido" }
  validates :base_price, numericality: { greater_than_or_equal_to: 0, message: "El precio debe ser mayor o igual a 0" }
  validates :cost, numericality: { greater_than_or_equal_to: 0, message: "El costo debe ser mayor o igual a 0" }
  validates :wholesale_min_quantity, numericality: { greater_than: 0, only_integer: true }
  validates :product_type, inclusion: { in: PRODUCT_TYPES, message: "Tipo de producto inválido" }

  validate :images_count_validation
  validate :images_type_validation

  scope :active, -> { where(active: true) }
  scope :physical_goods, -> { where(product_type: "good") }
  scope :services, -> { where(product_type: "service") }

  # Total stock across all variants
  def total_stock
    product_variants.sum(:stock)
  end

  # Unit price for a given quantity (applies wholesale price past the threshold)
  def price_for(quantity)
    if wholesale_price.present? && wholesale_price.positive? && quantity >= wholesale_min_quantity
      wholesale_price
    else
      base_price
    end
  end

  def service?
    product_type == "service"
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id name product_type base_price cost wholesale_price description active category_id brand_id created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[category brand product_variants]
  end

  private

  def images_count_validation
    errors.add(:images, "máximo #{MAX_IMAGES} imágenes por producto") if images.attached? && images.count > MAX_IMAGES
  end

  def images_type_validation
    return unless images.attached?

    acceptable = %w[image/jpeg image/jpg image/png image/webp]
    images.each do |img|
      errors.add(:images, "debe ser JPG, PNG o WEBP") unless acceptable.include?(img.blob.content_type)
      errors.add(:images, "cada imagen debe ser menor a 5MB") if img.blob.byte_size > MAX_IMAGE_SIZE
    end
  end

  def ensure_base_variant
    return unless product_type == "good"
    return if product_variants.reject(&:marked_for_destruction?).any?

    product_variants.build(stock: 0)
  end
end
