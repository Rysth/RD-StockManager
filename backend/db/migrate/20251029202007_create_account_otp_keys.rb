class CreateAccountOtpKeys < ActiveRecord::Migration[8.0]
  def change
    create_table :account_otp_keys do |t|
      t.references :account, null: false, foreign_key: true, type: :bigint, index: { unique: true }
      t.string :key, null: false
      t.integer :num_failures, null: false, default: 0
      t.timestamp :last_use, null: false, default: -> { 'CURRENT_TIMESTAMP' }
      t.timestamp :created_at, null: false, default: -> { 'CURRENT_TIMESTAMP' }
      t.timestamp :expires_at, null: false
    end

    add_index :account_otp_keys, :expires_at
  end
end
