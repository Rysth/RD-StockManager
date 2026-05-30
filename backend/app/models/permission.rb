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

  ALL_KEYS = [
    VIEW_DASHBOARD,
    VIEW_USERS, CREATE_USERS, EDIT_USERS, DELETE_USERS, EXPORT_USERS,
    VIEW_BUSINESS, EDIT_BUSINESS,
    EDIT_PROFILE
  ].freeze

  # Default permission mapping per role
  ROLE_DEFAULTS = {
    "admin" => ALL_KEYS,
    "manager" => [
      VIEW_DASHBOARD,
      VIEW_USERS, CREATE_USERS, EDIT_USERS, DELETE_USERS, EXPORT_USERS,
      VIEW_BUSINESS, EDIT_BUSINESS,
      EDIT_PROFILE
    ],
    "operator" => [
      VIEW_DASHBOARD,
      EDIT_PROFILE
    ],
    "user" => [
      EDIT_PROFILE
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
      { key: EDIT_PROFILE, name: "Editar Perfil", group: "profile", description: "Editar perfil propio" }
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
