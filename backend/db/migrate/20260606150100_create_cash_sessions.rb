class CreateCashSessions < ActiveRecord::Migration[8.0]
  def change
    create_table :cash_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :location, null: false, foreign_key: true
      t.integer  :status, default: 0, null: false # 0=open, 1=closed
      t.decimal  :opening_amount, precision: 10, scale: 2, default: 0, null: false
      t.decimal  :counted_amount, precision: 10, scale: 2
      t.decimal  :expected_amount, precision: 10, scale: 2
      t.decimal  :variance, precision: 10, scale: 2
      t.text     :notes
      t.datetime :opened_at, null: false
      t.datetime :closed_at
      t.timestamps
    end

    add_index :cash_sessions, :status
    # Solo una caja abierta por usuario+sucursal a la vez.
    add_index :cash_sessions, [:user_id, :location_id], unique: true, where: "status = 0",
              name: "index_cash_sessions_open_unique"

    add_reference :sales, :cash_session, foreign_key: true, null: true
  end
end
