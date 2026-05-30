class CreateOtpCodes < ActiveRecord::Migration[8.0]
  def change
    create_table :otp_codes do |t|
      t.references :account, null: false, foreign_key: true, index: true
      t.string :code, null: false, limit: 6
      t.datetime :expires_at, null: false
      t.datetime :used_at

      t.timestamps
    end

    add_index :otp_codes, :code
    add_index :otp_codes, :expires_at
  end
end
