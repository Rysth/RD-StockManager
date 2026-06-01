class CreateLocations < ActiveRecord::Migration[8.0]
  def change
    create_table :locations do |t|
      t.string :name, null: false
      t.string :address
      t.string :phone
      t.boolean :is_default, null: false, default: false
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :locations, :is_default
    add_index :locations, :active
  end
end
