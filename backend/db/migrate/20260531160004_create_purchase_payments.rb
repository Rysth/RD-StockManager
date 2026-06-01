class CreatePurchasePayments < ActiveRecord::Migration[7.1]
  def change
    create_table :purchase_payments do |t|
      t.references :purchase, null: false, foreign_key: true
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.string :payment_method, default: "cash", null: false
      t.timestamps
    end
  end
end
