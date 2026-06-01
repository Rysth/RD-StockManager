class CreateExpenses < ActiveRecord::Migration[8.0]
  def change
    create_table :expenses do |t|
      t.references :expense_category, null: true, foreign_key: true
      t.references :location, null: true, foreign_key: true
      t.references :user, null: true, foreign_key: true
      t.decimal :amount, precision: 10, scale: 2, null: false, default: 0
      t.datetime :expense_date
      t.text :description
      t.integer :payment_method, null: false, default: 0 # cash / transfer
      t.string :reference

      t.timestamps
    end

    add_index :expenses, :expense_date
  end
end
