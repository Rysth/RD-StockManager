class AddSriConfigToBusinesses < ActiveRecord::Migration[8.0]
  def change
    add_column :businesses, :sri_enabled, :boolean, null: false, default: false
    add_column :businesses, :sri_ambiente, :string, null: false, default: "1"
    add_column :businesses, :sri_cert_path, :string
    add_column :businesses, :sri_cert_filename, :string
    add_column :businesses, :sri_cert_uploaded_at, :datetime
    add_column :businesses, :sri_cert_password_ciphertext, :text
  end
end
