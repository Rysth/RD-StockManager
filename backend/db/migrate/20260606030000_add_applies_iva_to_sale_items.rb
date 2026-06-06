class AddAppliesIvaToSaleItems < ActiveRecord::Migration[7.1]
  def change
    add_column :sale_items, :applies_iva, :boolean, default: false, null: false
  end
end
