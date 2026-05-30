class CreateBusinesses < ActiveRecord::Migration[8.0]
  def change
    create_table :businesses do |t|
      t.string :name
      t.string :slogan
      t.string :whatsapp
      t.string :instagram
      t.string :facebook
      t.string :tiktok

      t.timestamps
    end
  end
end
