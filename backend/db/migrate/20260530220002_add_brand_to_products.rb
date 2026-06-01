class AddBrandToProducts < ActiveRecord::Migration[8.0]
  def up
    add_reference :products, :brand, foreign_key: true, null: true

    # Backfill: create a Brand for each distinct non-blank brand string and map it.
    say_with_time "Backfilling brands from products.brand" do
      names = select_values("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand <> ''")
      names.each do |name|
        execute(<<~SQL.squish)
          INSERT INTO brands (name, active, created_at, updated_at)
          VALUES (#{quote(name)}, TRUE, NOW(), NOW())
          ON CONFLICT (name) DO NOTHING
        SQL
        execute(<<~SQL.squish)
          UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = #{quote(name)})
          WHERE brand = #{quote(name)}
        SQL
      end
    end

    remove_column :products, :brand
  end

  def down
    add_column :products, :brand, :string
    execute(<<~SQL.squish)
      UPDATE products SET brand = (SELECT name FROM brands WHERE brands.id = products.brand_id)
      WHERE brand_id IS NOT NULL
    SQL
    remove_reference :products, :brand, foreign_key: true
  end
end
