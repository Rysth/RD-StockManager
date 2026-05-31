module Api
  module V1
    class ReportsController < BaseController
      MONTH_ABBR_ES = [nil, "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].freeze
      IVA_RATE = 0.15 # IVA Ecuador (precios incluyen IVA)

      before_action :authenticate_rodauth_user!
      before_action -> { authorize_permission!(Permission::VIEW_REPORTS) }

      # GET /api/v1/reports/purchases
      def purchases
        now = Time.current
        received = Purchase.received
        received = received.where(location_id: location_id) if location_id

        render_success(
          summary: {
            total_today: received.where(purchase_date: now.beginning_of_day..now).sum(:total),
            total_week: received.where(purchase_date: now.beginning_of_week..now).sum(:total),
            total_month: received.where(purchase_date: now.beginning_of_month..now).sum(:total),
            payable: received.where.not(payment_status: Purchase.payment_statuses[:paid]).sum("total - paid_amount")
          },
          by_supplier: received.joins("LEFT JOIN customers ON customers.id = purchases.customer_id")
                               .group("customers.id", "customers.name")
                               .order(Arel.sql("SUM(purchases.total) DESC"))
                               .limit(10)
                               .pluck("customers.name", Arel.sql("SUM(purchases.total)"), Arel.sql("COUNT(purchases.id)"))
                               .map { |name, total, count| { supplier: name || "Sin proveedor", total: total.to_f, count: count.to_i } },
          by_month: purchases_by_month(received, now)
        )
      end

      # GET /api/v1/reports/taxes — reporte fiscal (IVA cobrado en ventas, pagado en compras)
      def taxes
        now = Time.current
        sales = Sale.completed
        sales = sales.where(location_id: location_id) if location_id
        purchases = Purchase.received
        purchases = purchases.where(location_id: location_id) if location_id

        rows = (0..5).map do |i|
          start = (now - i.months).beginning_of_month
          finish = (now - i.months).end_of_month
          sales_total = sales.where(sold_at: start..finish).sum(:total).to_f
          tax_collected = (sales_total - sales_total / (1 + IVA_RATE)).round(2)
          tax_paid = purchases.where(purchase_date: start..finish).sum(:tax).to_f
          {
            month: start.strftime("%Y-%m"),
            label: "#{MONTH_ABBR_ES[start.month]} #{start.year}",
            sales_total: sales_total,
            tax_collected: tax_collected,
            tax_paid: tax_paid.round(2),
            net_tax: (tax_collected - tax_paid).round(2)
          }
        end.reverse

        render_success(by_month: rows)
      end

      # GET /api/v1/reports/contacts
      def contacts
        contacts = Customer.where(is_customer: true).or(Customer.where(is_supplier: true))
        sold = Sale.completed.group(:customer_id).sum(:total)
        purchased = Purchase.received.group(:customer_id).sum(:total)
        last_sale = Sale.completed.group(:customer_id).maximum(:sold_at)
        last_purchase = Purchase.received.group(:customer_id).maximum(:purchase_date)

        rows = contacts.order(:name).map do |c|
          {
            id: c.id,
            name: c.name,
            is_customer: c.is_customer,
            is_supplier: c.is_supplier,
            total_purchased_by: sold[c.id].to_f,      # lo que el cliente nos compró
            total_sold_to_us: purchased[c.id].to_f,   # lo que el proveedor nos vendió
            receivable: c.receivable,
            payable: c.payable,
            balance: c.balance,
            last_transaction: [last_sale[c.id], last_purchase[c.id]].compact.max
          }
        end

        render_success(contacts: rows)
      end

      # GET /api/v1/reports/expenses
      def expenses
        now = Time.current
        scope = Expense.all
        scope = scope.where(location_id: location_id) if location_id

        render_success(
          summary: {
            total_today: scope.where(expense_date: now.beginning_of_day..now).sum(:amount),
            total_week: scope.where(expense_date: now.beginning_of_week..now).sum(:amount),
            total_month: scope.where(expense_date: now.beginning_of_month..now).sum(:amount)
          },
          by_category: scope.joins("LEFT JOIN expense_categories ON expense_categories.id = expenses.expense_category_id")
                            .group("expense_categories.id", "expense_categories.name")
                            .order(Arel.sql("SUM(expenses.amount) DESC"))
                            .pluck("expense_categories.name", Arel.sql("SUM(expenses.amount)"))
                            .map { |name, total| { category: name || "Sin categoría", total: total.to_f } },
          by_location: scope.joins("LEFT JOIN locations ON locations.id = expenses.location_id")
                            .group("locations.id", "locations.name")
                            .order(Arel.sql("SUM(expenses.amount) DESC"))
                            .pluck("locations.name", Arel.sql("SUM(expenses.amount)"))
                            .map { |name, total| { location: name || "Sin ubicación", total: total.to_f } },
          by_month: expenses_by_month(scope, now)
        )
      end

      # GET /api/v1/reports/cash_register — flujo de caja en efectivo
      def cash_register
        now = Time.current
        sales = Sale.completed.payment_cash
        expenses = Expense.payment_cash
        if location_id
          sales = sales.where(location_id: location_id)
          expenses = expenses.where(location_id: location_id)
        end

        income = sales.where(sold_at: now.beginning_of_day..now).sum(:total)
        outflow = expenses.where(expense_date: now.beginning_of_day..now).sum(:amount)

        render_success(
          summary: {
            income_today: income,
            expense_today: outflow,
            net_today: income - outflow,
            income_month: sales.where(sold_at: now.beginning_of_month..now).sum(:total),
            expense_month: expenses.where(expense_date: now.beginning_of_month..now).sum(:amount)
          },
          by_day: cash_by_day(sales, expenses, now)
        )
      end

      # GET /api/v1/reports/sales_reps — desempeño por vendedor
      def sales_reps
        now = Time.current
        sales = Sale.completed.where(sold_at: now.beginning_of_month..now)
        sales = sales.where(location_id: location_id) if location_id

        totals = sales.group(:user_id).pluck(:user_id, Arel.sql("SUM(total)"), Arel.sql("COUNT(*)")).to_h { |uid, t, c| [uid, { total: t.to_f, count: c.to_i }] }
        profits = SaleItem.joins(:sale)
                          .where(sales: { status: Sale.statuses[:completed], sold_at: now.beginning_of_month..now })
                          .then { |rel| location_id ? rel.where(sales: { location_id: location_id }) : rel }
                          .group("sales.user_id")
                          .sum(Arel.sql("sale_items.quantity * (sale_items.unit_price - sale_items.unit_cost)"))

        user_names = User.where(id: totals.keys.compact).pluck(:id, :fullname).to_h
        rows = totals.map do |uid, data|
          {
            user_id: uid,
            seller: user_names[uid] || "Sin asignar",
            revenue: data[:total],
            sales_count: data[:count],
            profit: profits[uid].to_f
          }
        end.sort_by { |r| -r[:revenue] }

        render_success(sales_reps: rows)
      end

      private

      def location_id
        params[:location_id].presence
      end

      def purchases_by_month(scope, now)
        (0..5).map do |i|
          start = (now - i.months).beginning_of_month
          finish = (now - i.months).end_of_month
          {
            month: start.strftime("%Y-%m"),
            label: "#{MONTH_ABBR_ES[start.month]} #{start.year}",
            total: scope.where(purchase_date: start..finish).sum(:total).to_f,
            count: scope.where(purchase_date: start..finish).count
          }
        end.reverse
      end

      def expenses_by_month(scope, now)
        (0..5).map do |i|
          start = (now - i.months).beginning_of_month
          finish = (now - i.months).end_of_month
          {
            month: start.strftime("%Y-%m"),
            label: "#{MONTH_ABBR_ES[start.month]} #{start.year}",
            total: scope.where(expense_date: start..finish).sum(:amount).to_f
          }
        end.reverse
      end

      def cash_by_day(sales, expenses, now)
        income = sales.where(sold_at: 29.days.ago.beginning_of_day..now).group(Arel.sql("DATE(sold_at)")).sum(:total)
        outflow = expenses.where(expense_date: 29.days.ago.beginning_of_day..now).group(Arel.sql("DATE(expense_date)")).sum(:amount)
        (0..29).map do |i|
          day = (now - (29 - i).days).to_date
          inc = income[day]&.to_f || 0.0
          out = outflow[day]&.to_f || 0.0
          { date: day.strftime("%d/%m"), day: day.iso8601, income: inc, expense: out, net: inc - out }
        end
      end
    end
  end
end
