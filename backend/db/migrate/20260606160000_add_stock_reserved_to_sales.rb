class AddStockReservedToSales < ActiveRecord::Migration[8.0]
  def change
    add_column :sales, :stock_reserved, :boolean, default: false, null: false
  end
end
