class AddSriNextFacturaSecuencialToBusinesses < ActiveRecord::Migration[8.0]
  def change
    add_column :businesses, :sri_next_factura_secuencial, :integer, null: false, default: 1
  end
end
