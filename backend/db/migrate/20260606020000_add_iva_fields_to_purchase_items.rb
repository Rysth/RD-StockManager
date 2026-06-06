class AddIvaFieldsToPurchaseItems < ActiveRecord::Migration[8.0]
  def change
    add_column :purchase_items, :applies_iva, :boolean, default: true, null: false
    add_column :purchase_items, :tax_amount, :decimal, precision: 10, scale: 2, default: 0.0, null: false
  end
end
