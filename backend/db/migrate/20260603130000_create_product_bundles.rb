class CreateProductBundles < ActiveRecord::Migration[8.0]
  def change
    create_table :product_bundles do |t|
      t.string :name, null: false
      t.text :description
      t.decimal :base_price, precision: 10, scale: 2, null: false, default: 0
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    create_table :product_bundle_items do |t|
      t.references :product_bundle, null: false, foreign_key: true
      t.references :product_variant, null: false, foreign_key: true
      t.integer :quantity, null: false, default: 1

      t.timestamps
    end

    add_index :product_bundles, :name
    add_index :product_bundles, :active
    add_index :product_bundle_items, [:product_bundle_id, :product_variant_id], unique: true, name: "idx_bundle_items_on_bundle_and_variant"
    add_reference :sale_items, :product_bundle, foreign_key: true
  end
end
