class Permission < ApplicationRecord
  has_many :role_permissions, dependent: :destroy
  has_many :roles, through: :role_permissions

  validates :key, presence: true, uniqueness: true
  validates :name, presence: true
  validates :group, presence: true

  # Permission keys as constants for easy reference
  # Dashboard
  VIEW_DASHBOARD = "view_dashboard".freeze

  # Users
  VIEW_USERS    = "view_users".freeze
  CREATE_USERS  = "create_users".freeze
  EDIT_USERS    = "edit_users".freeze
  DELETE_USERS  = "delete_users".freeze
  EXPORT_USERS  = "export_users".freeze

  # Business
  VIEW_BUSINESS = "view_business".freeze
  EDIT_BUSINESS = "edit_business".freeze

  # Profile (own)
  EDIT_PROFILE = "edit_profile".freeze

  # Inventory & Sales (Tienda)
  VIEW_INVENTORY   = "view_inventory".freeze
  MANAGE_PRODUCTS  = "manage_products".freeze
  MANAGE_CUSTOMERS = "manage_customers".freeze
  MANAGE_SALES     = "manage_sales".freeze
  MANAGE_QUOTATIONS = "manage_quotations".freeze
  VIEW_REPORTS     = "view_reports".freeze

  # Locations / Warehouses (Tienda)
  VIEW_LOCATIONS   = "view_locations".freeze
  MANAGE_LOCATIONS = "manage_locations".freeze

  # Purchases / Compras (Tienda)
  VIEW_PURCHASES   = "view_purchases".freeze
  MANAGE_PURCHASES = "manage_purchases".freeze

  # Expenses / Gastos (Tienda)
  VIEW_EXPENSES   = "view_expenses".freeze
  MANAGE_EXPENSES = "manage_expenses".freeze

  # Facturación electrónica SRI (Tienda)
  MANAGE_INVOICING = "manage_invoicing".freeze

  ALL_KEYS = [
    VIEW_DASHBOARD,
    VIEW_USERS, CREATE_USERS, EDIT_USERS, DELETE_USERS, EXPORT_USERS,
    VIEW_BUSINESS, EDIT_BUSINESS,
    EDIT_PROFILE,
    VIEW_INVENTORY, MANAGE_PRODUCTS, MANAGE_CUSTOMERS, MANAGE_SALES, MANAGE_QUOTATIONS, VIEW_REPORTS,
    VIEW_LOCATIONS, MANAGE_LOCATIONS,
    VIEW_PURCHASES, MANAGE_PURCHASES,
    VIEW_EXPENSES, MANAGE_EXPENSES,
    MANAGE_INVOICING
  ].freeze

  # Default permission mapping per role.
  #   admin            → vendedor del software, acceso total (incluye usuarios)
  #   business_owner   → dueño del negocio, todo EXCEPTO gestión de usuarios
  #   business_employee→ empleado limitado: ventas, clientes y ver inventario
  ROLE_DEFAULTS = {
    "admin" => ALL_KEYS,
    "business_owner" => [
      VIEW_DASHBOARD,
      VIEW_BUSINESS, EDIT_BUSINESS,
      EDIT_PROFILE,
      VIEW_INVENTORY, MANAGE_PRODUCTS, MANAGE_CUSTOMERS, MANAGE_SALES, MANAGE_QUOTATIONS, VIEW_REPORTS,
      VIEW_LOCATIONS, MANAGE_LOCATIONS,
      VIEW_PURCHASES, MANAGE_PURCHASES,
      VIEW_EXPENSES, MANAGE_EXPENSES,
      MANAGE_INVOICING
    ],
    "business_employee" => [
      VIEW_DASHBOARD,
      EDIT_PROFILE,
      VIEW_INVENTORY, MANAGE_CUSTOMERS, MANAGE_SALES, MANAGE_QUOTATIONS,
      VIEW_LOCATIONS
    ]
  }.freeze

  # Seed all permissions and assign them to roles
  def self.seed!
    permission_definitions = [
      # Dashboard
      { key: VIEW_DASHBOARD, name: "Ver Dashboard", group: "dashboard", description: "Acceso al panel de control" },

      # Users
      { key: VIEW_USERS, name: "Ver Usuarios", group: "users", description: "Ver la lista de usuarios" },
      { key: CREATE_USERS, name: "Crear Usuarios", group: "users", description: "Crear nuevos usuarios" },
      { key: EDIT_USERS, name: "Editar Usuarios", group: "users", description: "Editar usuarios existentes" },
      { key: DELETE_USERS, name: "Eliminar Usuarios", group: "users", description: "Eliminar usuarios" },
      { key: EXPORT_USERS, name: "Exportar Usuarios", group: "users", description: "Exportar datos de usuarios" },

      # Business
      { key: VIEW_BUSINESS, name: "Ver Negocio", group: "business", description: "Ver configuración del negocio" },
      { key: EDIT_BUSINESS, name: "Editar Negocio", group: "business", description: "Editar configuración del negocio" },

      # Profile
      { key: EDIT_PROFILE, name: "Editar Perfil", group: "profile", description: "Editar perfil propio" },

      # Inventory & Sales (Tienda)
      { key: VIEW_INVENTORY, name: "Ver Inventario", group: "inventory", description: "Ver productos e inventario" },
      { key: MANAGE_PRODUCTS, name: "Gestionar Productos", group: "inventory", description: "Crear y editar productos y categorías" },
      { key: MANAGE_CUSTOMERS, name: "Gestionar Contactos", group: "customers", description: "Crear y editar clientes y proveedores" },
      { key: MANAGE_SALES, name: "Gestionar Ventas", group: "sales", description: "Registrar y gestionar ventas" },
      { key: MANAGE_QUOTATIONS, name: "Gestionar Cotizaciones", group: "quotations", description: "Crear, enviar y convertir cotizaciones" },
      { key: VIEW_REPORTS, name: "Ver Reportes", group: "reports", description: "Acceder a reportes de ventas" },

      # Locations (Tienda)
      { key: VIEW_LOCATIONS, name: "Ver Ubicaciones", group: "locations", description: "Ver ubicaciones y almacenes" },
      { key: MANAGE_LOCATIONS, name: "Gestionar Ubicaciones", group: "locations", description: "Crear y editar ubicaciones y almacenes" },

      # Purchases (Tienda)
      { key: VIEW_PURCHASES, name: "Ver Compras", group: "purchases", description: "Ver compras a proveedores" },
      { key: MANAGE_PURCHASES, name: "Gestionar Compras", group: "purchases", description: "Registrar y gestionar compras" },

      # Expenses (Tienda)
      { key: VIEW_EXPENSES, name: "Ver Gastos", group: "expenses", description: "Ver gastos del negocio" },
      { key: MANAGE_EXPENSES, name: "Gestionar Gastos", group: "expenses", description: "Registrar y gestionar gastos" },

      # Facturación electrónica (Tienda)
      { key: MANAGE_INVOICING, name: "Facturación Electrónica", group: "invoicing", description: "Emitir y consultar facturas electrónicas SRI" }
    ]

    permissions_by_key = {}

    permission_definitions.each do |attrs|
      perm = Permission.find_or_create_by!(key: attrs[:key]) do |p|
        p.name = attrs[:name]
        p.group = attrs[:group]
        p.description = attrs[:description]
      end
      permissions_by_key[attrs[:key]] = perm
    end

    # Assign permissions to roles
    ROLE_DEFAULTS.each do |role_name, perm_keys|
      role = Role.find_by(name: role_name)
      next unless role

      perm_keys.each do |key|
        perm = permissions_by_key[key]
        next unless perm

        RolePermission.find_or_create_by!(role: role, permission: perm)
      end
    end
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id key name group description created_at updated_at]
  end
end
