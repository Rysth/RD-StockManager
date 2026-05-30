class Role < ApplicationRecord
  has_and_belongs_to_many :users, :join_table => :users_roles
  has_many :role_permissions, dependent: :destroy
  has_many :permissions, through: :role_permissions

  belongs_to :resource,
             :polymorphic => true,
             :optional => true

  validates :resource_type,
            :inclusion => { :in => Rolify.resource_types },
            :allow_nil => true

  scopify

  # Check if the role has a specific permission
  def has_permission?(permission_key)
    permissions.exists?(key: permission_key)
  end

  def self.ransackable_attributes(auth_object = nil)
    %w[created_at id id_value name resource_id resource_type updated_at]
  end

  def self.ransackable_associations(auth_object = nil)
    %w[permissions role_permissions]
  end

  def self.ransackable_scopes(auth_object = nil)
    []
  end
end
