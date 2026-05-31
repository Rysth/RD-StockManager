# Exporta el catálogo de productos + variantes a un .xlsx.
#
# Cada fila es una variante. Si se pasa `location`, la columna Stock refleja
# la existencia en esa ubicación; si no, el stock total denormalizado.
class ProductExportService
  HEADERS = [
    "Producto", "Marca", "Categoria", "SKU", "Talla", "Color",
    "Precio", "Costo", "PrecioMayoreo", "Stock"
  ].freeze

  def self.export(location: nil)
    package = Axlsx::Package.new
    workbook = package.workbook

    header_style = workbook.styles.add_style(
      bg_color: "4472C4", fg_color: "FFFFFF", b: true,
      alignment: { horizontal: :center, vertical: :center }
    )

    sheet_name = location ? "Inventario #{location.name}".first(31) : "Inventario general"

    products = Product.active
                      .includes(:brand, :category, product_variants: { stock_levels: :location })
                      .order(:name)

    workbook.add_worksheet(name: sheet_name) do |sheet|
      sheet.add_row(HEADERS, style: header_style)

      products.each do |product|
        product.product_variants.each do |variant|
          stock = if location
                    variant.stock_levels.find { |sl| sl.location_id == location.id }&.quantity.to_i
                  else
                    variant.stock
                  end

          sheet.add_row([
            product.name,
            product.brand&.name,
            product.category&.name,
            variant.sku,
            variant.size,
            variant.color,
            product.base_price,
            product.cost,
            product.wholesale_price,
            stock
          ])
        end
      end

      sheet.column_widths(24, 14, 14, 16, 8, 12, 10, 10, 14, 8)
    end

    package.to_stream.read
  end
end
