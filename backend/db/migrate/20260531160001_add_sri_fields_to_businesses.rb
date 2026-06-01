class AddSriFieldsToBusinesses < ActiveRecord::Migration[8.0]
  def change
    add_column :businesses, :ruc, :string
    add_column :businesses, :razon_social, :string            # nombre legal (≠ name comercial)
    add_column :businesses, :dir_matriz, :string
    add_column :businesses, :dir_establecimiento, :string
    add_column :businesses, :obligado_contabilidad, :string, null: false, default: "NO"
    add_column :businesses, :establecimiento, :string, null: false, default: "001"
    add_column :businesses, :punto_emision, :string, null: false, default: "001"
    add_column :businesses, :contribuyente_especial, :string
    add_column :businesses, :contribuyente_rimpe, :string      # leyenda RIMPE (opcional)

    add_index :businesses, :ruc, unique: true
  end
end
