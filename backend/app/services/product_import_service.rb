# Bulk product import from an .xlsx spreadsheet.
#
# Each row represents ONE product variant. Rows are grouped by product
# (name + brand + category) so a product with several sizes/colors spans
# several rows. Brands and categories are created on the fly when missing.
#
# Template / expected columns (in this order):
#   Producto | Marca | Categoria | Precio | Costo | PrecioMayoreo | Talla | Color | Stock
class ProductImportService
  class InvalidFile < StandardError; end

  HEADERS = [
    "Producto", "Marca", "Categoria", "Precio", "Costo",
    "PrecioMayoreo", "Talla", "Color", "Stock"
  ].freeze

  # Build the downloadable .xlsx template (headers + a couple of example rows).
  def self.template
    package = Axlsx::Package.new
    workbook = package.workbook

    header_style = workbook.styles.add_style(
      bg_color: "4472C4", fg_color: "FFFFFF", b: true,
      alignment: { horizontal: :center, vertical: :center }
    )

    workbook.add_worksheet(name: "Productos") do |sheet|
      sheet.add_row(HEADERS, style: header_style)
      sheet.add_row(["Air Max 270", "Nike", "Deporte", 129.99, 78.0, 110.0, "38", "Negro", 10])
      sheet.add_row(["Air Max 270", "Nike", "Deporte", 129.99, 78.0, 110.0, "40", "Blanco", 8])
      sheet.add_row(["Chuck Taylor", "Converse", "Casual", 64.99, 39.0, 55.0, "39", "Gris", 12])
      sheet.column_widths(22, 14, 14, 10, 10, 14, 8, 12, 8)
    end

    package.to_stream.read
  end

  # Import the given file (a path or IO). Returns a summary hash:
  #   { products_created:, variants_created:, rows:, errors: [...] }
  def self.import(file)
    new(file).import
  end

  def initialize(file)
    @spreadsheet = Roo::Spreadsheet.open(file, extension: :xlsx)
  rescue StandardError => e
    raise InvalidFile, "No se pudo leer el archivo: #{e.message}"
  end

  def import
    sheet = @spreadsheet.sheet(0)
    errors = []
    products_created = 0
    variants_created = 0
    rows_processed = 0

    ActiveRecord::Base.transaction do
      (2..sheet.last_row).each do |i|
        row = sheet.row(i)
        next if row.compact.empty? # skip blank rows

        name, brand_name, category_name, price, cost, wholesale, size, color, stock = row.first(9)
        next if name.blank? # need at least a product name

        rows_processed += 1

        begin
          category = Category.where("LOWER(name) = ?", category_name.to_s.strip.downcase).first
          category ||= Category.create!(name: category_name.to_s.strip.presence || "Sin categoría", active: true)

          brand = nil
          if brand_name.present?
            brand = Brand.where("LOWER(name) = ?", brand_name.to_s.strip.downcase).first
            brand ||= Brand.create!(name: brand_name.to_s.strip, active: true)
          end

          product = Product.where("LOWER(name) = ?", name.to_s.strip.downcase)
                           .where(brand_id: brand&.id, category_id: category.id).first
          if product.nil?
            product = Product.create!(
              name: name.to_s.strip,
              brand: brand,
              category: category,
              base_price: to_decimal(price),
              cost: to_decimal(cost),
              wholesale_price: to_decimal(wholesale),
              wholesale_min_quantity: 3,
              active: true
            )
            products_created += 1
          end

          product.product_variants.create!(
            size: size.to_s.strip,
            color: color.to_s.strip,
            stock: stock.to_i
          )
          variants_created += 1
        rescue ActiveRecord::RecordInvalid => e
          errors << "Fila #{i}: #{e.record.errors.full_messages.join(', ')}"
        end
      end
    end

    {
      rows: rows_processed,
      products_created: products_created,
      variants_created: variants_created,
      errors: errors
    }
  end

  private

  def to_decimal(value)
    return 0 if value.blank?

    value.to_s.tr(",", ".").to_f
  end
end
