class AddDetailsToBusinesses < ActiveRecord::Migration[8.0]
  def change
    add_column :businesses, :email, :string
    add_column :businesses, :location, :string
  end
end
