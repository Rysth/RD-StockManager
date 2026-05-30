# Attaches/removes images for products and product variants.
# Mirrors CloudflareBusinessStorageService: uses Cloudflare R2 in production
# and the local Disk service in development/test.
class ProductImageStorageService
  MAX_IMAGES = 3

  # record  - a Product or ProductVariant (responds to #images)
  # files   - one file or an array of uploaded files
  # folder  - storage folder prefix ("products" / "variants")
  def self.attach(record, files, folder:)
    files = Array(files).compact
    return if files.empty?

    available = MAX_IMAGES - record.images.count
    return if available <= 0

    service_name = Rails.env.production? ? :cloudflare : :local

    files.first(available).each do |file|
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
end
