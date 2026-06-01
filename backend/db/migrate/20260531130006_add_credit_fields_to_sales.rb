class AddCreditFieldsToSales < ActiveRecord::Migration[8.0]
  def change
    add_column :sales, :paid_amount, :decimal, precision: 10, scale: 2, null: false, default: 0
    add_column :sales, :payment_status, :integer, null: false, default: 0 # due / partial / paid
    add_column :sales, :due_date, :date

    add_index :sales, :due_date

    # Las ventas existentes se consideran pagadas (POS al contado).
    reversible do |dir|
      dir.up do
        execute <<~SQL
          UPDATE sales SET paid_amount = total, payment_status = 2 WHERE status = 1
        SQL
      end
    end
  end
end
