class Location < ApplicationRecord
  audited

  has_many :stock_levels, dependent: :destroy
  has_many :sales, dependent: :nullify

  validates :name, presence: { message: "El nombre es requerido" }

  scope :active, -> { where(active: true) }

  before_save :unset_other_defaults, if: -> { is_default? && will_save_change_to_is_default? }

  # Default location used when a sale/movement doesn't specify one.
  def self.default
    active.find_by(is_default: true) || active.order(:id).first || order(:id).first
  end

  def code
    "SUC-#{id.to_s.rjust(3, '0')}"
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id name address phone is_default active created_at updated_at]
  end

  private

  def unset_other_defaults
    Location.where.not(id: id).update_all(is_default: false)
  end
end
