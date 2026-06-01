class CreateStockLevels < ActiveRecord::Migration[8.0]
  def change
    create_table :stock_levels do |t|
      t.references :product_variant, null: false, foreign_key: true
      t.references :location, null: false, foreign_key: true
      t.integer :quantity, null: false, default: 0

      t.timestamps
    end

    add_index :stock_levels, [:product_variant_id, :location_id], unique: true
  end
end
