class AddBarcodeToProductVariants < ActiveRecord::Migration[8.0]
  def change
    add_column :product_variants, :barcode, :string
    add_index :product_variants, :barcode, unique: true, where: "barcode IS NOT NULL"
  end
end
