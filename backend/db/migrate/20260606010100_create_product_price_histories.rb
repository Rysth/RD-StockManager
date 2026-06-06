class CreateProductPriceHistories < ActiveRecord::Migration[8.0]
  def change
    create_table :product_price_histories do |t|
      t.references :product, null: false, foreign_key: true
      t.decimal :old_cost, precision: 10, scale: 2
      t.decimal :new_cost, precision: 10, scale: 2
      t.decimal :old_base_price, precision: 10, scale: 2
      t.decimal :new_base_price, precision: 10, scale: 2
      t.decimal :old_wholesale_price, precision: 10, scale: 2
      t.decimal :new_wholesale_price, precision: 10, scale: 2
      t.references :user, null: true, foreign_key: { to_table: :accounts }
      t.string :source, default: "manual", null: false
      t.bigint :purchase_id, null: true
      t.timestamps
    end

    add_index :product_price_histories, :purchase_id
    add_index :product_price_histories, [:product_id, :created_at]
  end
end
