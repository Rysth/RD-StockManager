# Roadmap — POS Safety & Cash Controls

## 1. Backend: Below-cost enforcement for `business_employee`

**Files:** `backend/app/models/sale_item.rb`, `backend/app/controllers/api/v1/sales_controller.rb`

- Add validation in `SaleItem`:
  - On create, compare `unit_price` vs `unit_cost` (already set in `set_unit_price`).
  - Exempt services (`product_variant.product.service?`).
  - For bundles, use `product_bundle.total_cost`.
  - Only reject if user is `business_employee` (check `sale.user.has_role?(:business_employee)`).
  - Error: `No puedes vender productos por debajo del costo`.

- This covers both `create` and `sync_items` since both create `SaleItem` records.

---

## 2. Frontend: Below-cost UX in `SalesPosIndex.tsx`

**File:** `admin/src/pages/dashboard/sales/SalesPosIndex.tsx`

- Detect `isBusinessEmployee = user?.roles?.includes("business_employee")`.
- In `setUnitValue` handler (line 847): prevent value below `i.cost` for non-service items.
  - Toast: `No puedes vender por debajo del costo`.
- Disable `Confirmar y registrar` button if any cart item has `unit_value < cost` for `business_employee`.
- Optional: show a warning badge on affected cart rows.

---

## 3. Frontend: Cash received & change

**File:** `admin/src/pages/dashboard/sales/SalesPosIndex.tsx`

- Add state: `const [cashReceived, setCashReceived] = useState("");`
- Compute: `const changeDue = cashReceived ? parseFloat(cashReceived) - total : 0;`
- Show in cart footer (below total):
  ```
  Recibido: [input field]
  Cambio:   $X.XX
  ```
- In confirm dialog: show received + change.
- Disable `Confirmar y registrar` when `paymentMethod === "cash"` and `cashReceived < total`.
- Reset `cashReceived` in `resetAfterSubmit` and `clearAll`.
- Reset `cashReceived` when switching to transfer payment.
- Include received/change in `handlePrintTicket` lines.

---

## 4. Backend: Persist cash_received / cash_change

**Files:** `backend/db/migrate/YYYYMMDD_add_cash_fields_to_sales.rb`, `Sale`, `CreateSaleData`

- Migration: `add_column :sales, :cash_received, :decimal, precision: 10, scale: 2, default: nil`
- Migration: `add_column :sales, :cash_change, :decimal, precision: 10, scale: 2, default: nil`
- Permit params in `sales_controller.rb` (`sale_params`, `sale_update_params`).
- Frontend: add `cash_received` and `cash_change` to `CreateSaleData` and send them.

---

## 5. Cash Session Model (opening/closing per seller shift)

**Files:** New migration + model + controller + store + UI

### Migration
```ruby
create_table :cash_sessions do |t|
  t.references :user, null: false
  t.references :location, null: false
  t.integer :status, default: 0, null: false  # 0=open, 1=closed
  t.decimal :opening_amount, precision: 10, scale: 2, default: 0, null: false
  t.decimal :counted_amount, precision: 10, scale: 2
  t.decimal :expected_amount, precision: 10, scale: 2
  t.decimal :variance, precision: 10, scale: 2
  t.text :notes
  t.datetime :opened_at, null: false
  t.datetime :closed_at
  t.timestamps
end
add_column :sales, :cash_session_id, :bigint
```

### Model: `CashSession`
- `belongs_to :user`, `belongs_to :location`, `has_many :sales`
- `enum status: { open: 0, closed: 1 }`
- Methods:
  - `close!(counted_amount, notes)`: locks, calculates expected, variance, sets closed_at.
  - `expected_cash`: opening + completed cash sales in session.
  - `self.current_for(user, location)`: find open session.

### API: `CashSessionsController`
- `GET /api/v1/cash_sessions/current` — return open session for current user+location.
- `POST /api/v1/cash_sessions/open` — create with opening_amount.
- `PUT /api/v1/cash_sessions/:id/close` — close with counted_amount + notes.
- `GET /api/v1/cash_sessions/:id` — detail with sales list.

### Frontend: Cash Session UI
- `useCashSessionStore` — fetch current, open, close.
- Dialog/modal in `SalesPosIndex`:
  - If no open session and payment is cash: show "Abrir caja" prompt with opening amount input.
  - Disable completed cash sales until session is open.
  - "Cerrar caja" button in cart footer (only when session is open).
  - Closing dialog: counted cash input, auto-calculated expected + variance, notes field.

### POS Block
- In `submitSale`: if `paymentMethod === "cash"` and `!cashOnDelivery` and no open session, show toast: `Debes abrir la caja antes de registrar ventas en efectivo`.

### Routes
- In `backend/config/routes.rb`: `resources :cash_sessions` with members `close`.

---

## 6. Verify

```bash
# Backend
cd backend && rails db:migrate
rails test                    # or rspec if present

# Frontend
cd admin && npx tsc --noEmit

# Manual tests:
# - Cash sale: check received/change, ticket
# - Below-cost: employee blocked, owner/admin allowed
# - Transfer sale: no cash received needed
# - COD sale: no cash received needed
# - Cash session: open, complete sale, close, verify expected/variance
```

---

## Order of Execution

1. Backend below-cost validation + migration
2. Frontend below-cost UX
3. Frontend cash received/change UI
4. Backend cash_received/cash_change migration + params
5. Cash session migration + model + controller
6. Cash session store + UI dialogs
7. Verify (tsc + manual)
