class AddContactFieldsToCustomers < ActiveRecord::Migration[8.0]
  def change
    add_column :customers, :is_customer, :boolean, null: false, default: true
    add_column :customers, :is_supplier, :boolean, null: false, default: false
    add_column :customers, :email, :string
    add_column :customers, :credit_limit, :decimal, precision: 10, scale: 2, null: false, default: 0
    add_column :customers, :payment_term_days, :integer

    add_index :customers, :is_customer
    add_index :customers, :is_supplier
  end
end
