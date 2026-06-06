class CreateStockTransferItems < ActiveRecord::Migration[8.0]
  def change
    create_table :stock_transfer_items do |t|
      t.references :stock_transfer,  null: false, foreign_key: true
      t.references :product_variant, null: false, foreign_key: true
      t.integer    :quantity, null: false
      t.timestamps
    end
  end
end
