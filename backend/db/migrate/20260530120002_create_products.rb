class CreateProducts < ActiveRecord::Migration[8.0]
  def change
    create_table :products do |t|
      t.string :name, null: false
      t.string :brand
      t.decimal :base_price, precision: 10, scale: 2, null: false, default: 0
      t.text :description
      t.boolean :active, null: false, default: true
      t.references :category, null: false, foreign_key: true

      t.timestamps
    end

    add_index :products, :name
  end
end
