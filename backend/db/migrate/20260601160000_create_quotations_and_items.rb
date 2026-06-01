class CreateQuotationsAndItems < ActiveRecord::Migration[8.0]
  def change
    create_table :quotations do |t|
      t.references :customer, null: true, foreign_key: true
      t.references :user, null: true, foreign_key: true
      t.references :location, null: true, foreign_key: true
      t.references :sale, null: true, foreign_key: true # venta generada al convertir
      t.string :quotation_number, null: false
      t.integer :status, null: false, default: 0
      t.date :valid_until
      t.text :notes
      t.decimal :tax_rate, precision: 5, scale: 2, null: false, default: 15
      t.decimal :subtotal, precision: 10, scale: 2, null: false, default: 0
      t.decimal :tax_amount, precision: 10, scale: 2, null: false, default: 0
      t.decimal :total, precision: 10, scale: 2, null: false, default: 0

      t.timestamps
    end

    add_index :quotations, :quotation_number, unique: true
    add_index :quotations, :status

    create_table :quotation_items do |t|
      t.references :quotation, null: false, foreign_key: true
      t.references :product_variant, null: true, foreign_key: true
      t.string :description, null: false
      t.decimal :quantity, precision: 10, scale: 2, null: false, default: 1
      t.decimal :unit_price, precision: 10, scale: 2, null: false, default: 0

      t.timestamps
    end
  end
end
