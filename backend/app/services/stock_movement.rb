# Ajusta el stock de una variante en una ubicación concreta y mantiene sincronizado
# el total denormalizado en `product_variants.stock` (suma de todas las ubicaciones).
#
# `delta` positivo = entra stock (compra, cancelación de venta);
# `delta` negativo = sale stock (venta).
#
# Usa `update_column` para el total, evitando disparar callbacks de ProductVariant.
class StockMovement
  def self.apply!(variant:, location:, delta:)
    raise ArgumentError, "Se requiere una ubicación para mover stock" if location.nil?

    ActiveRecord::Base.transaction do
      level = StockLevel.lock.find_or_create_by!(product_variant: variant, location: location)
      new_quantity = level.quantity + delta

      if new_quantity.negative?
        level.errors.add(:quantity, "Stock insuficiente en #{location.name} para #{variant.sku} (disponible: #{level.quantity})")
        raise ActiveRecord::RecordInvalid, level
      end

      level.update!(quantity: new_quantity)
      variant.update_column(:stock, variant.stock_levels.sum(:quantity))
    end
  end
end
