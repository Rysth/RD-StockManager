class Expense < ApplicationRecord
  audited

  enum :payment_method, { cash: 0, transfer: 1 }, prefix: :payment

  belongs_to :expense_category, optional: true
  belongs_to :location, optional: true
  belongs_to :user, optional: true
  belongs_to :employee, class_name: "User", optional: true

  validates :amount, numericality: { greater_than: 0, message: "El monto debe ser mayor a 0" }

  before_validation :set_expense_date, on: :create

  def self.ransackable_attributes(_auth_object = nil)
    %w[id amount expense_date description payment_method reference expense_category_id location_id user_id employee_id created_at updated_at]
  end

  def code
    "GAS-#{(expense_date || created_at).year}-#{id.to_s.rjust(6, '0')}"
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[expense_category location user employee]
  end

  private

  def set_expense_date
    self.expense_date ||= Time.current
  end
end
