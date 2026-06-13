class AddUserLimitToBusinesses < ActiveRecord::Migration[8.0]
  def change
    add_column :businesses, :user_limit, :integer, default: 5, null: false
  end
end
