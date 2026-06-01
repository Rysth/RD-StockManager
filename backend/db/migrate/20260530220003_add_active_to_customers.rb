class AddActiveToCustomers < ActiveRecord::Migration[8.0]
  def change
    add_column :customers, :active, :boolean, null: false, default: true
    add_index :customers, :active
  end
end
