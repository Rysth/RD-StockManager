class AllowServiceSaleItems < ActiveRecord::Migration[8.0]
  def change
    change_column_null :sale_items, :product_variant_id, true
    add_column :sale_items, :description, :string
  end
end
