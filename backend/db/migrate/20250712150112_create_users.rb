class CreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users do |t|
      t.references :account, null: false, foreign_key: true
      t.string :fullname, null: false
      t.string :username, null: false
      t.string :phone_number
      t.string :identification
      
      t.timestamps
    end
    
    add_index :users, :username, unique: true
  end
end