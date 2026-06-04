class ProductVariant < ApplicationRecord
  LOW_STOCK_THRESHOLD = 5
  MAX_IMAGES = 3
  MAX_IMAGE_SIZE = 5.megabytes

  audited associated_with: :product

  belongs_to :product
  has_many :sale_items, dependent: :restrict_with_error
  has_many :stock_levels, dependent: :destroy
  has_many_attached :images

  before_validation :generate_sku, on: :create
  after_create :seed_initial_stock_level
  after_update :reconcile_default_stock_level, if: :saved_change_to_stock?

  validates :sku, presence: true, uniqueness: { message: "El SKU ya existe" }
  validates :stock, numericality: { greater_than_or_equal_to: 0, only_integer: true }
  validate :images_count_validation
  validate :images_type_validation

  # `stock` is the denormalized total across every location, so these aggregate
  # scopes keep working unchanged. Use the *_at scopes for a single location.
  scope :in_stock, -> { where("stock > 0") }
  scope :low_stock, -> { where("stock > 0 AND stock <= ?", LOW_STOCK_THRESHOLD) }
  scope :out_of_stock, -> { where(stock: 0) }

  scope :low_stock_at, ->(location_id) {
    joins(:stock_levels).where(stock_levels: { location_id: location_id })
                        .where("stock_levels.quantity > 0 AND stock_levels.quantity <= ?", LOW_STOCK_THRESHOLD)
  }

  # Stock available for a single location (0 when there is no level row yet).
  def stock_for(location)
    return 0 if location.nil?

    stock_levels.where(location_id: location.id).sum(:quantity)
  end

  # Total across all locations (kept in sync as the `stock` cache column).
  def total_stock
    stock
  end

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
      errors.add(:images, "cada imagen debe ser menor a 5MB") if img.blob.byte_size > MAX_IMAGE_SIZE
    end
  end

  # When a variant is created with an initial stock value (e.g. from the product
  # form or Excel import), record it against the default location.
  def seed_initial_stock_level
    return if stock.to_i.zero?

    location = Location.default
    return if location.nil?

    stock_levels.create!(location: location, quantity: stock)
  end

  # When the stock total is edited directly through the product form, keep the
  # default location's level consistent so the per-location detail still sums up.
  # Movements made via StockMovement use update_column and skip this callback.
  def reconcile_default_stock_level
    location = Location.default
    return if location.nil?

    others = stock_levels.where.not(location_id: location.id).sum(:quantity)
    level = stock_levels.find_or_initialize_by(location_id: location.id)
    level.quantity = [stock - others, 0].max
    level.save!
  end

  # Auto-generate a unique SKU from the product brand/name + size/color
  def generate_sku
    return if sku.present?

    prefix = product&.brand&.name.presence || product&.name.presence || "PRD"
    base = [prefix[0, 3], size, color].compact.join("-").upcase.gsub(/[^A-Z0-9\-]/, "")
    candidate = "#{base}-#{SecureRandom.hex(2).upcase}"
    candidate = "#{base}-#{SecureRandom.hex(2).upcase}" while ProductVariant.exists?(sku: candidate)
    self.sku = candidate
  end
end
