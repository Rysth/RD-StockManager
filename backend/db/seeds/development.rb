# Development Seeds - Run ONLY in development environment
# This file creates test data for local development

unless Rails.env.development?
  puts "⚠️  This seed file is only for development environment!"
  puts "Current environment: #{Rails.env}"
  exit 1
end

puts "🌱 Seeding development database..."

# Clear existing data
puts "Clearing existing data..."
Audited::Audit.delete_all if defined?(Audited::Audit)
SaleItem.delete_all
Sale.delete_all
Customer.delete_all
ProductVariant.delete_all
Product.delete_all
Brand.delete_all
Category.delete_all
User.destroy_all
Account.destroy_all
Role.destroy_all

# Create the three business roles
#   admin             → vendedor del software (yo), acceso total
#   business_owner    → dueño del negocio, todo excepto usuarios
#   business_employee → empleado limitado: ventas, clientes, ver inventario
puts "Creating roles..."
admin_role            = Role.create!(name: 'admin')
business_owner_role   = Role.create!(name: 'business_owner')
business_employee_role = Role.create!(name: 'business_employee')

# Create permissions and assign to roles
puts "Creating permissions..."
Permission.seed!

# Use BCrypt directly to hash passwords (same as Rodauth uses)
require 'bcrypt'
password_hash = BCrypt::Password.create("password123", cost: 12)

def create_user(email:, fullname:, username:, role:, password_hash:)
  account = Account.create!(email: email, password_hash: password_hash, status: 2) # verified
  user = User.create!(account: account, fullname: fullname, username: username)
  user.add_role(role)
  user
end

puts "Creating accounts..."
admin_user = create_user(
  email: "admin@example.com", fullname: "Administrador (Software)", username: "admin",
  role: :admin, password_hash: password_hash
)
owner_user = create_user(
  email: "owner@example.com", fullname: "Dueña de la Tienda", username: "owner",
  role: :business_owner, password_hash: password_hash
)
employee1 = create_user(
  email: "empleado1@example.com", fullname: "Empleada Mostrador", username: "empleado1",
  role: :business_employee, password_hash: password_hash
)
employee2 = create_user(
  email: "empleado2@example.com", fullname: "Empleado Bodega", username: "empleado2",
  role: :business_employee, password_hash: password_hash
)

puts ""
puts "=" * 60
puts "✅ Roles & accounts seeded!"
puts "=" * 60
puts "📋 Roles: #{Role.pluck(:name).join(', ')}"
puts "🔐 Permissions: #{Permission.count}"
puts "👥 Accounts (password: password123):"
puts "   • admin@example.com        → admin (acceso total, incl. usuarios)"
puts "   • owner@example.com        → business_owner (todo excepto usuarios)"
puts "   • empleado1@example.com    → business_employee (ventas, clientes, ver inventario)"
puts "   • empleado2@example.com    → business_employee"
puts "=" * 60

# ──────────────────────────────────────────────────────────────
# Inventario y Ventas (Tienda de zapatos)
# ──────────────────────────────────────────────────────────────
puts ""
puts "👟 Seeding inventory & sales demo data..."

# 5 categorías
category_names = {
  "Mujer"    => "Calzado para dama",
  "Hombre"   => "Calzado para caballero",
  "Niños"    => "Calzado infantil",
  "Deporte"  => "Zapatos deportivos y running",
  "Casual"   => "Calzado casual y urbano"
}
categories = category_names.map do |name, description|
  Category.create!(name: name, description: description, active: true)
end

# Marcas (ahora entidad administrable)
brand_names = %w[Nike Adidas Puma Converse Vans Reebok Crocs Skechers]
brands = brand_names.index_with { |name| Brand.create!(name: name, active: true) }

# 10 productos
product_defs = [
  { name: "Air Max 270",       brand: "Nike",     base_price: 129.99, category: "Deporte" },
  { name: "Ultraboost 22",     brand: "Adidas",   base_price: 149.99, category: "Deporte" },
  { name: "RS-X",              brand: "Puma",     base_price: 99.90,  category: "Casual" },
  { name: "Chuck Taylor",      brand: "Converse", base_price: 64.99,  category: "Casual" },
  { name: "Old Skool",         brand: "Vans",     base_price: 69.99,  category: "Casual" },
  { name: "Classic Leather",   brand: "Reebok",   base_price: 84.99,  category: "Hombre" },
  { name: "Sandalia Comfort",  brand: "Crocs",    base_price: 39.99,  category: "Mujer" },
  { name: "Skech-Air",         brand: "Skechers", base_price: 74.99,  category: "Mujer" },
  { name: "Revolution 6",      brand: "Nike",     base_price: 59.99,  category: "Niños" },
  { name: "Grand Court",       brand: "Adidas",   base_price: 54.99,  category: "Niños" }
]

colors = %w[Negro Blanco Azul Rojo Gris]
products = product_defs.map do |attrs|
  category = categories.find { |c| c.name == attrs[:category] }
  base = attrs[:base_price]
  Product.create!(
    name: attrs[:name],
    brand: brands[attrs[:brand]],
    base_price: base,
    cost: (base * 0.6).round(2),                # costo ≈ 60% del precio
    wholesale_price: (base * 0.85).round(2),    # mayoreo ≈ 85% del precio
    wholesale_min_quantity: 3,
    description: "#{attrs[:brand]} #{attrs[:name]}",
    active: true,
    category: category
  )
end

# ~60 variantes (tallas según categoría + colores, stock generoso)
all_variants = []
products.each do |product|
  sizes = case product.category.name
          when "Niños" then %w[28 30 32 34]
          else %w[36 38 40 42]
          end
  product_colors = colors.sample(rand(1..2))
  sizes.each do |size|
    product_colors.each do |color|
      all_variants << product.product_variants.create!(
        size: size,
        color: color,
        stock: rand(8..40)
      )
    end
  end
end

# 20 clientes con ciudades ecuatorianas
first_names = %w[María José Andrea Carlos Gabriela Luis Daniela Jorge Verónica Diego Paola Fernando Karina Andrés Cristina Pablo Mónica Esteban Valeria Roberto]
last_names  = %w[González Pérez Vera Macías Cedeño Zambrano Mendoza Loor Bravo Andrade Vélez Ponce Rodríguez Castro Intriago Palacios Moreira Salazar Chávez Burgos]
cities      = ["Guayaquil", "Quito", "Cuenca", "Manta", "Machala", "Portoviejo", "Durán", "Ambato", "Loja", "Santo Domingo"]
customers = 20.times.map do |i|
  Customer.create!(
    name: "#{first_names[i]} #{last_names[i]}",
    phone: "09#{rand(10000000..99999999)}",
    city: cities.sample,
    active: true
  )
end

# 30 ventas distribuidas en los últimos 60 días (mix de estados + método de pago)
sellers = [owner_user, employee1, employee2]
statuses = ([:completed] * 22) + ([:pending] * 5) + ([:cancelled] * 3)
payment_methods = %i[cash transfer]
created_sales = 0

statuses.shuffle.each do |target_status|
  sold_at = rand(0..59).days.ago.change(hour: rand(8..20), min: rand(0..59))
  # Pick 1-3 variants that currently have stock
  available = all_variants.select { |v| v.reload.stock >= 3 }.sample(rand(1..3))
  next if available.empty?

  sale = Sale.new(
    customer: (rand < 0.85 ? customers.sample : nil),
    user: sellers.sample,
    status: :pending,
    payment_method: payment_methods.sample,
    cash_on_delivery: (rand < 0.25),
    sold_at: sold_at
  )
  available.each do |variant|
    sale.sale_items.build(
      product_variant: variant,
      quantity: rand(1..2),
      unit_price: variant.product.base_price
    )
  end

  begin
    sale.save!
    sale.recalculate_total!
    case target_status
    when :completed then sale.complete!
    when :cancelled then sale.update!(status: :cancelled)
    end
    created_sales += 1
  rescue ActiveRecord::RecordInvalid
    next
  end
end

puts ""
puts "=" * 60
puts "✅ Inventory & sales demo seeded!"
puts "=" * 60
puts "   • Categorías:  #{Category.count}"
puts "   • Marcas:      #{Brand.count}"
puts "   • Productos:   #{Product.count}"
puts "   • Variantes:   #{ProductVariant.count}"
puts "   • Clientes:    #{Customer.count}"
puts "   • Ventas:      #{Sale.count} (#{Sale.completed.count} completadas, #{Sale.pending.count} pendientes, #{Sale.cancelled.count} canceladas)"
puts "=" * 60
