class ProductVariant < ApplicationRecord
  LOW_STOCK_THRESHOLD = 5
  MAX_IMAGES = 3

  belongs_to :product
  has_many :sale_items, dependent: :restrict_with_error
  has_many_attached :images

  before_validation :generate_sku, on: :create

  validates :sku, presence: true, uniqueness: { message: "El SKU ya existe" }
  validates :stock, numericality: { greater_than_or_equal_to: 0, only_integer: true }
  validate :images_count_validation
  validate :images_type_validation

  scope :in_stock, -> { where("stock > 0") }
  scope :low_stock, -> { where("stock > 0 AND stock <= ?", LOW_STOCK_THRESHOLD) }
  scope :out_of_stock, -> { where(stock: 0) }

  def low_stock?
    stock.positive? && stock <= LOW_STOCK_THRESHOLD
  end

  def out_of_stock?
    stock.zero?
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id product_id size color stock sku created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[product]
  end

  private

  def images_count_validation
    errors.add(:images, "máximo #{MAX_IMAGES} imágenes por variante") if images.attached? && images.count > MAX_IMAGES
  end

  def images_type_validation
    return unless images.attached?

    acceptable = %w[image/jpeg image/jpg image/png image/webp]
    images.each do |img|
      errors.add(:images, "debe ser JPG, PNG o WEBP") unless acceptable.include?(img.blob.content_type)
      errors.add(:images, "cada imagen debe ser menor a 2MB") if img.blob.byte_size > 2.megabytes
    end
  end

  # Auto-generate a unique SKU from the product brand/name + size/color
  def generate_sku
    return if sku.present?

    prefix = product&.brand.presence || product&.name.presence || "PRD"
    base = [prefix[0, 3], size, color].compact.join("-").upcase.gsub(/[^A-Z0-9\-]/, "")
    candidate = "#{base}-#{SecureRandom.hex(2).upcase}"
    candidate = "#{base}-#{SecureRandom.hex(2).upcase}" while ProductVariant.exists?(sku: candidate)
    self.sku = candidate
  end
end
