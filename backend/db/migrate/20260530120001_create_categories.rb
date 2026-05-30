class CreateCategories < ActiveRecord::Migration[8.0]
  def change
    create_table :categories do |t|
      t.string :name, null: false
      t.string :description
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :categories, :name
  end
end
