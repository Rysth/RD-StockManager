class AddPaymentToSales < ActiveRecord::Migration[8.0]
  def change
    add_column :sales, :payment_method, :integer, null: false, default: 0
    add_column :sales, :cash_on_delivery, :boolean, null: false, default: false
  end
end
