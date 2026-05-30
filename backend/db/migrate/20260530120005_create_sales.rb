class CreateSales < ActiveRecord::Migration[8.0]
  def change
    create_table :sales do |t|
      t.references :customer, null: true, foreign_key: true
      t.references :user, null: true, foreign_key: true
      t.integer :status, null: false, default: 0
      t.decimal :total, precision: 10, scale: 2, null: false, default: 0
      t.datetime :sold_at

      t.timestamps
    end

    add_index :sales, :status
    add_index :sales, :sold_at
  end
end
