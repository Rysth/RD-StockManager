class Category < ApplicationRecord
  audited

  has_many :products, dependent: :restrict_with_error
  belongs_to :parent, class_name: "Category", optional: true
  has_many :subcategories, class_name: "Category", foreign_key: :parent_id, dependent: :nullify

  validates :name, presence: { message: "El nombre es requerido" }
  validates :name, uniqueness: { message: "Esta categoría ya existe" }
  validate :parent_cannot_be_self
  validate :parent_cannot_be_descendant

  scope :active, -> { where(active: true) }
  scope :roots, -> { where(parent_id: nil) }

  # IDs de esta categoría + sus subcategorías (para filtrar productos por una raíz)
  def self_and_descendant_ids
    [id] + descendant_ids
  end

  def descendant_ids
    subcategories.flat_map { |subcategory| [subcategory.id] + subcategory.descendant_ids }
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[id name description active parent_id created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[products parent subcategories]
  end

  private

  def parent_cannot_be_self
    errors.add(:parent_id, "no puede ser la misma categoría") if parent_id.present? && parent_id == id
  end

  def parent_cannot_be_descendant
    return if parent_id.blank? || id.blank?

    errors.add(:parent_id, "no puede ser una subcategoría") if descendant_ids.include?(parent_id)
  end
end
