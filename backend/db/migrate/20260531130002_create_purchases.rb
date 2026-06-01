class CreatePurchases < ActiveRecord::Migration[8.0]
  def change
    create_table :purchases do |t|
      t.references :customer, null: true, foreign_key: true # proveedor
      t.references :location, null: true, foreign_key: true
      t.references :user, null: true, foreign_key: true
      t.integer :status, null: false, default: 0          # draft / received / cancelled
      t.integer :payment_status, null: false, default: 0  # due / partial / paid
      t.datetime :purchase_date
      t.date :due_date
      t.decimal :subtotal, precision: 10, scale: 2, null: false, default: 0
      t.decimal :discount, precision: 10, scale: 2, null: false, default: 0
      t.decimal :tax, precision: 10, scale: 2, null: false, default: 0
      t.decimal :total, precision: 10, scale: 2, null: false, default: 0
      t.decimal :paid_amount, precision: 10, scale: 2, null: false, default: 0
      t.string :reference
      t.text :notes

      t.timestamps
    end

    add_index :purchases, :status
    add_index :purchases, :payment_status
    add_index :purchases, :purchase_date
    add_index :purchases, :due_date
  end
end
