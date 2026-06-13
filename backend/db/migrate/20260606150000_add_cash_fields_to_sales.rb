class AddCashFieldsToSales < ActiveRecord::Migration[8.0]
  def change
    add_column :sales, :cash_received, :decimal, precision: 10, scale: 2, default: nil
    add_column :sales, :cash_change, :decimal, precision: 10, scale: 2, default: nil
  end
end
