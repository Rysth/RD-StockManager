class BackfillLocationsAndStock < ActiveRecord::Migration[8.0]
  # Mueve el stock existente (entero único en product_variants.stock) hacia el nuevo
  # modelo por ubicación. Crea una ubicación por defecto "Principal" y copia el stock
  # de cada variante hacia ella. También asigna las ventas históricas a esa ubicación.
  def up
    # 1. Ubicación por defecto (solo si aún no hay ninguna)
    execute <<~SQL
      INSERT INTO locations (name, is_default, active, created_at, updated_at)
      SELECT 'Principal', true, true, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM locations)
    SQL

    # 2. Copiar el stock de cada variante a la ubicación por defecto
    execute <<~SQL
      INSERT INTO stock_levels (product_variant_id, location_id, quantity, created_at, updated_at)
      SELECT pv.id, l.id, pv.stock, now(), now()
      FROM product_variants pv
      CROSS JOIN (SELECT id FROM locations WHERE is_default = true ORDER BY id LIMIT 1) l
      ON CONFLICT (product_variant_id, location_id) DO NOTHING
    SQL

    # 3. Asignar las ventas existentes a la ubicación por defecto
    execute <<~SQL
      UPDATE sales
      SET location_id = (SELECT id FROM locations WHERE is_default = true ORDER BY id LIMIT 1)
      WHERE location_id IS NULL
    SQL
  end

  def down
    execute "UPDATE sales SET location_id = NULL"
    execute "DELETE FROM stock_levels"
    execute "DELETE FROM locations WHERE name = 'Principal'"
  end
end
