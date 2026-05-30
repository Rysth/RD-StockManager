class CloudflareBusinessStorageService
  def self.attach_business_logo(business, file)
    return unless file.present?

    folder_path = "business/#{business.id}"
    timestamp = Time.current.to_i
    extension = File.extname(file.original_filename)
    filename = "logo_#{timestamp}#{extension}"
    key = "#{folder_path}/#{filename}"

    service_name = Rails.env.production? ? :cloudflare : :local

    blob = ActiveStorage::Blob.create_and_upload!(
      io: file.tempfile,
      filename: filename,
      content_type: file.content_type,
      key: key,
      service_name: service_name
    )

    business.logo.attach(blob)
  end

  def self.delete_business_logo(business)
    business.logo.purge if business.logo.attached?
  end
end