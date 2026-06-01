class AddCostAndWholesaleToProducts < ActiveRecord::Migration[8.0]
  def change
    add_column :products, :cost, :decimal, precision: 10, scale: 2, null: false, default: 0
    add_column :products, :wholesale_price, :decimal, precision: 10, scale: 2
    add_column :products, :wholesale_min_quantity, :integer, null: false, default: 3
  end
end
