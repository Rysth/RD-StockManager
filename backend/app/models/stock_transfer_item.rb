class StockTransferItem < ApplicationRecord
  belongs_to :stock_transfer
  belongs_to :product_variant

  validates :quantity, numericality: { greater_than: 0, only_integer: true }
end
