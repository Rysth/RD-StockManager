class AddDetailsToCustomers < ActiveRecord::Migration[8.0]
  def change
    add_column :customers, :id_type, :string
    add_column :customers, :id_number, :string
    add_column :customers, :country, :string, default: "Ecuador"
    add_column :customers, :address, :text
  end
end
