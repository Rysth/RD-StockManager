class AddFullnameAndUsernameToAccounts < ActiveRecord::Migration[8.0]
  def change
    add_column :accounts, :fullname, :string
    add_column :accounts, :username, :string

    # Only enforce uniqueness for non-null usernames
    add_index :accounts, :username, unique: true, where: "username IS NOT NULL"
  end
end