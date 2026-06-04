# Attaches/removes images for products and product variants.
# Mirrors CloudflareBusinessStorageService: uses Cloudflare R2 in production
# and the local Disk service in development/test.
class ProductImageStorageService
  MAX_IMAGES = 3
  MAX_IMAGE_SIZE = 5.megabytes
  ACCEPTABLE_CONTENT_TYPES = %w[image/jpeg image/jpg image/png image/webp].freeze
  InvalidImage = Class.new(StandardError)

  # record  - a Product or ProductVariant (responds to #images)
  # files   - one file or an array of uploaded files
  # folder  - storage folder prefix ("products" / "variants")
  def self.attach(record, files, folder:)
    files = Array(files).compact
    return if files.empty?

    available = MAX_IMAGES - record.images.count
    raise InvalidImage, "máximo #{MAX_IMAGES} imágenes" if available <= 0

    service_name = Rails.env.production? ? :cloudflare : :local

    files.first(available).each do |file|
      validate_file!(file)

      timestamp = Time.current.to_i
      extension = File.extname(file.original_filename)
      filename = "img_#{timestamp}_#{SecureRandom.hex(4)}#{extension}"
      key = "#{folder}/#{record.id}/#{filename}"

      blob = ActiveStorage::Blob.create_and_upload!(
        io: file.tempfile,
        filename: filename,
        content_type: file.content_type,
        key: key,
        service_name: service_name
      )

      record.images.attach(blob)
    end
  end

  def self.remove(record, image_id)
    attachment = record.images.find_by(id: image_id)
    attachment&.purge
  end

  def self.validate_file!(file)
    unless ACCEPTABLE_CONTENT_TYPES.include?(file.content_type)
      raise InvalidImage, "La imagen debe ser JPG, PNG o WEBP"
    end

    return unless file.size.to_i > MAX_IMAGE_SIZE

    raise InvalidImage, "Cada imagen debe ser menor a 5MB"
  end
end
