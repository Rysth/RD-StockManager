class BackfillBaseProductVariants < ActiveRecord::Migration[8.0]
  def up
    execute <<~SQL
      INSERT INTO product_variants (product_id, size, color, stock, sku, created_at, updated_at)
      SELECT
        products.id,
        NULL,
        NULL,
        0,
        CONCAT('BASE-', products.id, '-', SUBSTR(MD5(RANDOM()::text || CLOCK_TIMESTAMP()::text), 1, 6)),
        NOW(),
        NOW()
      FROM products
      WHERE products.product_type = 'good'
        AND NOT EXISTS (
          SELECT 1
          FROM product_variants
          WHERE product_variants.product_id = products.id
        )
    SQL
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
