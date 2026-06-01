class AddLocationToSales < ActiveRecord::Migration[8.0]
  def change
    add_reference :sales, :location, null: true, foreign_key: true
  end
end
