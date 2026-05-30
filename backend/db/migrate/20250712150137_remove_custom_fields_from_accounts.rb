class RemoveCustomFieldsFromAccounts < ActiveRecord::Migration[8.0]
  def change
    remove_index :accounts, :username if index_exists?(:accounts, :username)
    remove_column :accounts, :fullname, :string
    remove_column :accounts, :username, :string
  end
end