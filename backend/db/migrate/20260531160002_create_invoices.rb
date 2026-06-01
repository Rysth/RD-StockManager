class CreateInvoices < ActiveRecord::Migration[8.0]
  def change
    create_table :invoices do |t|
      t.references :sale, null: false, foreign_key: true
      t.string   :clave_acceso
      t.integer  :secuencial, null: false
      t.string   :establecimiento, null: false, default: "001"
      t.string   :punto_emision,   null: false, default: "001"
      t.string   :ambiente,        null: false                  # "1" pruebas / "2" producción
      t.string   :estado,          null: false, default: "ERROR"
      t.string   :numero_autorizacion
      t.datetime :fecha_autorizacion
      t.text     :xml_firmado
      t.text     :xml_autorizado
      t.binary   :ride_pdf
      t.jsonb    :mensajes, null: false, default: []
      t.jsonb    :comprador_snapshot, null: false, default: {}
      t.decimal  :importe_total, precision: 10, scale: 2

      t.timestamps
    end

    add_index :invoices, :clave_acceso, unique: true
    add_index :invoices, %i[establecimiento punto_emision secuencial],
              unique: true, name: "idx_invoices_emission_point_secuencial"
  end
end
