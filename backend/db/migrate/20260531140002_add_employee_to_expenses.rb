class AddEmployeeToExpenses < ActiveRecord::Migration[8.0]
  def change
    add_reference :expenses, :employee, null: true, foreign_key: { to_table: :users }
  end
end
