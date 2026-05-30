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
SaleItem.delete_all
Sale.delete_all
Customer.delete_all
ProductVariant.delete_all
Product.delete_all
Category.delete_all
User.destroy_all
Account.destroy_all
Role.destroy_all

# Create default roles
puts "Creating roles..."
admin_role = Role.create!(name: 'admin')
manager_role = Role.create!(name: 'manager') 
operator_role = Role.create!(name: 'operator')
user_role = Role.create!(name: 'user')

# Create permissions and assign to roles
puts "Creating permissions..."
Permission.seed!

# Use BCrypt directly to hash passwords (same as Rodauth uses)
require 'bcrypt'
password_hash = BCrypt::Password.create("password123", cost: 12)

# Create 1 verified admin account with user
puts "Creating admin account..."
admin_account = Account.create!(
  email: "admin@example.com",
  password_hash: password_hash,
  status: 2 # verified status
)

admin_user = User.create!(
  account: admin_account,
  fullname: "System Administrator",
  username: "admin"
)
admin_user.add_role(:admin)

# Create 1 verified manager
puts "Creating manager account..."
manager_account = Account.create!(
  email: "manager@example.com", 
  password_hash: password_hash,
  status: 2
)

manager_user = User.create!(
  account: manager_account,
  fullname: "System Manager",
  username: "manager"
)
manager_user.add_role(:manager)

# Create 1 verified operator
puts "Creating operator account..."
operator_account = Account.create!(
  email: "operator@example.com",
  password_hash: password_hash, 
  status: 2
)

operator_user = User.create!(
  account: operator_account,
  fullname: "System Operator", 
  username: "operator"
)
operator_user.add_role(:operator)

# Create 20 unverified regular users
puts "Creating 20 regular users..."
20.times do |i|
  account = Account.create!(
    email: "user#{i + 1}@example.com",
    password_hash: password_hash,
    status: 1 # unverified status
  )
  
  user = User.create!(
    account: account,
    fullname: "User #{i + 1}",
    username: "user#{i + 1}"
  )
  user.add_role(:user)
end

puts ""
puts "=" * 60
puts "✅ Development database seeded successfully!"
puts "=" * 60
puts ""
puts "📋 Created roles: #{Role.pluck(:name).join(', ')}"
puts "🔐 Created permissions: #{Permission.count} (#{Permission.pluck(:key).join(', ')})"
puts ""
puts "👥 Created 23 accounts with associated users:"
puts "   • 1 verified admin: admin@example.com (admin role)"
puts "   • 1 verified manager: manager@example.com (manager role)"  
puts "   • 1 verified operator: operator@example.com (operator role)"
puts "   • 20 unverified users: user1@example.com through user20@example.com (user role)"
puts ""
puts "🔑 All accounts have password: password123"
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
  Product.create!(
    name: attrs[:name],
    brand: attrs[:brand],
    base_price: attrs[:base_price],
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
    city: cities.sample
  )
end

# 30 ventas distribuidas en los últimos 60 días (mix de estados)
sellers = [admin_user, manager_user, operator_user]
statuses = ([:completed] * 22) + ([:pending] * 5) + ([:cancelled] * 3)
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
puts "   • Productos:   #{Product.count}"
puts "   • Variantes:   #{ProductVariant.count}"
puts "   • Clientes:    #{Customer.count}"
puts "   • Ventas:      #{Sale.count} (#{Sale.completed.count} completadas, #{Sale.pending.count} pendientes, #{Sale.cancelled.count} canceladas)"
puts "=" * 60
