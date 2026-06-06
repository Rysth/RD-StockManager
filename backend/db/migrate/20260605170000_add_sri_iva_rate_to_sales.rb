class AddSriIvaRateToSales < ActiveRecord::Migration[8.0]
  def change
    add_column :sales, :sri_iva_rate, :decimal, precision: 5, scale: 2, default: 0, null: false
  end
end
