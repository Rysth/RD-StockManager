class CreatePermissions < ActiveRecord::Migration[8.0]
  def change
    create_table :permissions do |t|
      t.string :key, null: false
      t.string :name, null: false
      t.string :description
      t.string :group, null: false, default: "general"

      t.timestamps
    end

    add_index :permissions, :key, unique: true

    create_table :role_permissions do |t|
      t.references :role, null: false, foreign_key: true
      t.references :permission, null: false, foreign_key: true

      t.timestamps
    end

    add_index :role_permissions, [:role_id, :permission_id], unique: true
  end
end
