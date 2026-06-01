class CreateProductVariants < ActiveRecord::Migration[8.0]
  def change
    create_table :product_variants do |t|
      t.references :product, null: false, foreign_key: true
      t.string :size
      t.string :color
      t.integer :stock, null: false, default: 0
      t.string :sku, null: false

      t.timestamps
    end

    add_index :product_variants, :sku, unique: true
  end
end
