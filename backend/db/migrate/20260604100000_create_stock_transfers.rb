class CreateStockTransfers < ActiveRecord::Migration[8.0]
  def change
    create_table :stock_transfers do |t|
      t.references :from_location, null: false, foreign_key: { to_table: :locations }
      t.references :to_location,   null: false, foreign_key: { to_table: :locations }
      t.references :requested_by,  null: false, foreign_key: { to_table: :users }
      t.references :received_by,   null: true,  foreign_key: { to_table: :users }
      t.integer  :status, default: 0, null: false
      t.text     :notes
      t.datetime :received_at
      t.timestamps
    end

    add_index :stock_transfers, :status
  end
end
