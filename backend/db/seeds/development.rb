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
PurchaseItem.delete_all
Purchase.delete_all
Expense.delete_all
ExpenseCategory.delete_all
SaleItem.delete_all
Sale.delete_all
Customer.delete_all
StockLevel.delete_all
ProductVariant.delete_all
Product.delete_all
Brand.delete_all
Category.delete_all
Location.delete_all
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

# Categorías — calzado + gorras/accesorios (la tienda vende ambos)
category_names = {
  "Mujer"        => "Calzado y accesorios para dama",
  "Hombre"       => "Calzado y accesorios para caballero",
  "Niños"        => "Calzado infantil",
  "Deporte"      => "Zapatos deportivos y running",
  "Casual"       => "Calzado casual y urbano",
  "Gorras"       => "Gorras y sombreros",
  "Accesorios"   => "Otros accesorios de moda"
}
categories = category_names.map do |name, description|
  Category.create!(name: name, description: description, active: true)
end

# Marcas (ahora entidad administrable) — calzado + gorras
brand_names = %w[Nike Adidas Puma Converse Vans Reebok Crocs Skechers New\ Era Volcom]
brand_names = ["Nike", "Adidas", "Puma", "Converse", "Vans", "Reebok", "Crocs", "Skechers", "New Era", "Volcom"]
brands = brand_names.index_with { |name| Brand.create!(name: name, active: true) }

# Ubicaciones / almacenes — el stock inicial de las variantes se asigna a la principal
puts "Creating locations..."
main_location = Location.create!(name: "Tienda Principal", address: "Av. 9 de Octubre y Malecón", phone: "042000000", is_default: true, active: true)
warehouse = Location.create!(name: "Bodega Norte", address: "Vía a Daule km 10", phone: "042111111", is_default: false, active: true)

# 12 productos — 10 calzado + 2 gorras
product_defs = [
  { name: "Air Max 270",        brand: "Nike",     base_price: 129.99, category: "Deporte" },
  { name: "Ultraboost 22",      brand: "Adidas",   base_price: 149.99, category: "Deporte" },
  { name: "RS-X",               brand: "Puma",     base_price: 99.90,  category: "Casual" },
  { name: "Chuck Taylor",       brand: "Converse", base_price: 64.99,  category: "Casual" },
  { name: "Old Skool",          brand: "Vans",     base_price: 69.99,  category: "Casual" },
  { name: "Classic Leather",    brand: "Reebok",   base_price: 84.99,  category: "Hombre" },
  { name: "Sandalia Comfort",   brand: "Crocs",    base_price: 39.99,  category: "Mujer" },
  { name: "Skech-Air",          brand: "Skechers", base_price: 74.99,  category: "Mujer" },
  { name: "Revolution 6",       brand: "Nike",     base_price: 59.99,  category: "Niños" },
  { name: "Grand Court",        brand: "Adidas",   base_price: 54.99,  category: "Niños" },
  { name: "9FORTY Adjustable",  brand: "New Era",  base_price: 34.99,  category: "Gorras" },
  { name: "Full-Zip Logo Cap",  brand: "Volcom",   base_price: 28.99,  category: "Gorras" }
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
          when "Niños"  then %w[28 30 32 34]
          when "Gorras" then %w[S M L]
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

# Distribuir algo de stock a la Bodega Norte (~40% de las variantes) para demostrar
# el inventario multi-ubicación. El stock inicial ya vive en la Tienda Principal.
all_variants.sample((all_variants.size * 0.4).round).each do |variant|
  StockMovement.apply!(variant: variant, location: warehouse, delta: rand(3..15))
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

# ──────────────────────────────────────────────────────────────
# Proveedores (contactos marcados como is_supplier)
# ──────────────────────────────────────────────────────────────
puts "Creating suppliers..."
supplier_names = [
  "Distribuidora Calzado S.A.", "Importadora Andina", "Textiles del Pacífico",
  "Comercial Gorras Ec", "Mayorista Deportivo"
]
suppliers = supplier_names.map.with_index do |name, i|
  Customer.create!(
    name: name,
    is_customer: false,
    is_supplier: true,
    phone: "04#{rand(2000000..2999999)}",
    email: "ventas#{i + 1}@proveedor.com",
    city: ["Guayaquil", "Quito", "Ambato"].sample,
    payment_term_days: [15, 30, 45].sample,
    active: true
  )
end

# ──────────────────────────────────────────────────────────────
# Compras a proveedores (ingreso de mercancía por ubicación)
# ──────────────────────────────────────────────────────────────
puts "Creating purchases..."
purchase_locations = [main_location, warehouse]
created_purchases = 0
12.times do |i|
  purchased_at = rand(0..45).days.ago.change(hour: rand(8..18))
  variants = all_variants.sample(rand(2..5))
  next if variants.empty?

  # ~70% recibidas y pagadas; algunas a crédito con vencimiento próximo; pocas en borrador
  received = rand < 0.85
  due_date = (rand < 0.4 ? Date.current + rand(-3..10).days : nil)

  purchase = Purchase.new(
    customer: suppliers.sample,
    location: purchase_locations.sample,
    user: owner_user,
    status: :draft,
    purchase_date: purchased_at,
    due_date: due_date,
    tax: 0,
    reference: "FAC-#{1000 + i}"
  )
  variants.each do |variant|
    purchase.purchase_items.build(
      product_variant: variant,
      quantity: rand(5..20),
      unit_cost: (variant.product.cost.to_f.positive? ? variant.product.cost : variant.product.base_price * 0.6).round(2)
    )
  end

  begin
    purchase.save!
    purchase.recalculate_total!
    if received
      purchase.receive!
      # 60% pagadas completas, resto parcial/por pagar
      paid = rand < 0.6 ? purchase.total : (rand < 0.5 ? purchase.total * 0.5 : 0)
      purchase.update!(paid_amount: paid)
      purchase.sync_payment_status!
      # Si quedó saldo pendiente, fija un vencimiento próximo para demostrar las alertas
      if paid < purchase.total
        purchase.update_column(:due_date, Date.current + rand(2..6).days)
      end
    end
    created_purchases += 1
  rescue ActiveRecord::RecordInvalid
    next
  end
end

# ──────────────────────────────────────────────────────────────
# Gastos (categorizados, por ubicación)
# ──────────────────────────────────────────────────────────────
puts "Creating expenses..."
expense_categories = ["Arriendo", "Servicios básicos", "Sueldos", "Transporte", "Marketing"].map do |name|
  ExpenseCategory.create!(name: name, active: true, is_payroll: name == "Sueldos")
end
payroll_employees = [employee1, employee2]

expense_descriptions = {
  "Arriendo" => "Pago de arriendo del local",
  "Servicios básicos" => "Luz, agua e internet",
  "Sueldos" => "Pago de nómina",
  "Transporte" => "Combustible y fletes",
  "Marketing" => "Publicidad en redes sociales"
}
created_expenses = 0
18.times do
  cat = expense_categories.sample
  Expense.create!(
    expense_category: cat,
    location: purchase_locations.sample,
    user: owner_user,
    employee: (cat.is_payroll ? payroll_employees.sample : nil),
    amount: [25, 40, 60, 120, 250, 500].sample + rand(0..50),
    expense_date: rand(0..45).days.ago.change(hour: rand(8..18)),
    description: expense_descriptions[cat.name],
    payment_method: %i[cash transfer].sample
  )
  created_expenses += 1
end

puts ""
puts "=" * 60
puts "✅ Inventory & sales demo seeded!"
puts "=" * 60
puts "   • Categorías:  #{Category.count}"
puts "   • Marcas:      #{Brand.count}"
puts "   • Ubicaciones: #{Location.count} (#{Location.pluck(:name).join(', ')})"
puts "   • Productos:   #{Product.count}"
puts "   • Variantes:   #{ProductVariant.count}"
puts "   • Niveles stock: #{StockLevel.count}"
puts "   • Clientes:    #{Customer.count}"
puts "   • Ventas:      #{Sale.count} (#{Sale.completed.count} completadas, #{Sale.pending.count} pendientes, #{Sale.cancelled.count} canceladas)"
puts "   • Proveedores: #{Customer.suppliers.count}"
puts "   • Compras:     #{Purchase.count} (#{Purchase.received.count} recibidas, #{Purchase.draft.count} borrador)"
puts "   • Gastos:      #{Expense.count} en #{ExpenseCategory.count} categorías"
puts "=" * 60

# ──────────────────────────────────────────────────────────────
# Negocio: EDLU Store
# ──────────────────────────────────────────────────────────────
puts ""
puts "🏪 Updating business profile → EDLU Store..."
Business.current.update!(
  name: "EDLU Store",
  slogan: "Venta de gorras y calzados",
  whatsapp: "+593983236580",
  tiktok: "edlu_store_ec",
  email: "storeedlu@gmail.com",
  location: "Guayas-Guayaquil",
  instagram: "",
  facebook: ""
)
puts "   ✅ Business: #{Business.current.name} — #{Business.current.slogan}"
puts "   ℹ️  Sube el logo manualmente desde Settings → Negocio."
