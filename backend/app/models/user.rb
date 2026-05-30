class User < ApplicationRecord
  rolify
  
  # Association
  belongs_to :account

  # Basic validations
  validates :username, presence: { message: "El nombre de usuario es requerido" }
  validates :username, uniqueness: { message: "Este nombre de usuario ya está en uso" }
  validates :username, format: { 
    with: /\A[a-zA-Z0-9_]+\z/, 
    message: "Solo se permiten letras, números y guiones bajos" 
  }
  
  validates :fullname, presence: { message: "El nombre completo es requerido" }

  # Delegate account methods for convenience
  delegate :email, :status, :verified?, to: :account

  # Callback to destroy account when user is destroyed
  before_destroy :destroy_account

  # ── Permissions ──────────────────────────────────────────────

  # Collect all unique permission keys across all of the user's roles
  def permission_keys
    Permission
      .joins(:role_permissions)
      .where(role_permissions: { role_id: role_ids })
      .distinct
      .pluck(:key)
  end

  # Check if the user has a specific permission through any of their roles
  def has_permission?(key)
    Permission
      .joins(:role_permissions)
      .where(role_permissions: { role_id: role_ids })
      .exists?(key: key)
  end
  
  private
  
  def destroy_account
    account.destroy if account.present?
  end
  
  def verified?
    account.status == 'verified'
  end

  # Add ransackable attributes for search functionality
  def self.ransackable_attributes(auth_object = nil)
    ["id", "username", "fullname", "created_at", "updated_at"]
  end

  def self.ransackable_associations(auth_object = nil)
    ["roles", "account"]
  end
end
