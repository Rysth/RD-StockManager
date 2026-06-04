# Changes to merge into `main`

All commits below are generic platform improvements from the `clients/rysthdesign`
branch that contain no client-specific data. They should be cherry-picked (or
merged via a filtered PR) into `main` to keep both branches at feature parity.

---

## Commits to include (oldest → newest)

### 1. `a3695ec` — 2026-06-01 · Fix production boot and make compose self-contained

Fixes a `NameError` on boot caused by `FrontendUrls` being referenced in
environment config before its initializer loaded. Also makes the production
Docker Compose stack self-contained: adds postgres and redis services with
healthchecks, defaults `DATABASE_URL`/`REDIS_URL` to internal containers
(external URLs still override), and switches from `db:migrate` to `db:prepare`.

**Backend**
- `backend/config/environments/development.rb`
- `backend/config/environments/production.rb`
- `backend/config/initializers/frontend_urls.rb`

**Infra**
- `docker-compose.prod.yml`

---

### 2. `2000919` — 2026-06-01 · Updated design of quote print template and print.css

Refreshes the PDF/print output for quotations: improved layout, spacing, and
typography in the print stylesheet; simplified the default terms & conditions
text.

**Frontend**
- `admin/src/components/print/QuotePrintTemplate.tsx`
- `admin/src/constants/terms.ts`
- `admin/src/styles/print.css`

---

### 3. `98a83cb` — 2026-06-02 · Allow selling services without stock

Services (product_type = "service") no longer require stock to be sold. The
backend skips stock deduction for service-type sale items; the POS hides the
stock-available guard for services.

**Backend**
- `backend/app/models/product.rb`
- `backend/app/models/sale.rb`
- `backend/app/models/sale_item.rb`

**Frontend**
- `admin/src/pages/dashboard/sales/PosIndex.tsx`

---

### 4. `7313059` — 2026-06-02 · Select services without variants in POS

When a service product has no named variants (size/color), clicking its card in
the POS directly adds it to the cart (no variant-picker dialog). Products with
multiple variants still open the picker as before.

**Frontend**
- `admin/src/pages/dashboard/sales/PosIndex.tsx`

---

### 5. `e8e370c` — 2026-06-03 · Enhanced UX for AppSidebar and products creation

Multiple UX improvements: responsive sidebar polish, ProductFormModal image
upload and variant management enhancements, POS improvements (category filter
pills, better stock-at-location display), Dashboard stat card updates, and
`Product.low_stock_threshold` constant on the backend.

**Backend**
- `backend/app/models/product.rb`

**Frontend**
- `admin/src/components/navigation/AppSidebar.tsx`
- `admin/src/pages/dashboard/Dashboard.tsx`
- `admin/src/pages/dashboard/products/ProductFormModal.tsx`
- `admin/src/pages/dashboard/products/ProductsIndex.tsx`
- `admin/src/pages/dashboard/purchases/PurchasesIndex.tsx`
- `admin/src/pages/dashboard/sales/PosIndex.tsx`

---

### 6. `d26cbc1` — 2026-06-03 · Backfill base product variants migration

Data migration that ensures every product that was created without an explicit
variant still has a base `ProductVariant` record, which is required by later
features (bundle items, transfer items).

**Backend**
- `backend/db/migrate/20260603120000_backfill_base_product_variants.rb`

---

### 7. `1bc38e6` — 2026-06-03 · Improve purchase receiving workflow

Expands the purchase detail sheet with a full receiving workflow: mark as
received, add payments, view payment history. Backend adds a split purchases
controller (create vs update paths), and a purchase payment model improvement.
POS purchase-entry mode also receives related polish.

**Backend**
- `backend/app/controllers/api/v1/purchases_controller.rb`
- `backend/app/controllers/api/v1/purchase_payments_controller.rb`
- `backend/app/models/purchase_payment.rb`

**Frontend**
- `admin/src/components/navigation/AppSidebar.tsx`
- `admin/src/pages/dashboard/purchases/PurchaseDetailSheet.tsx`
- `admin/src/pages/dashboard/purchases/PaymentDialog.tsx`
- `admin/src/pages/dashboard/purchases/PurchasesIndex.tsx`
- `admin/src/pages/dashboard/sales/PosIndex.tsx`
- `admin/src/stores/purchaseStore.ts`
- `admin/src/types/inventory.ts`

---

### 8. `8176c52` — 2026-06-03 · Split POS purchase entry route

Separates the POS into two distinct routes: `/dashboard/pos` (sales only) and
`/dashboard/purchase-entry` (purchase-mode only). Extracts `ProductCard` as a
reusable component. Sidebar updated with the new purchase-entry link.

**Frontend**
- `admin/src/components/navigation/AppSidebar.tsx`
- `admin/src/pages/dashboard/Dashboard.tsx`
- `admin/src/pages/dashboard/purchases/PurchaseEntryIndex.tsx` *(new)*
- `admin/src/pages/dashboard/purchases/PurchasesIndex.tsx`
- `admin/src/pages/dashboard/sales/PosIndex.tsx`
- `admin/src/pages/dashboard/sales/ProductCard.tsx` *(new)*
- `admin/src/pages/dashboard/sales/SalesPosIndex.tsx` *(new)*
- `admin/src/routes/index.tsx`

---

### 9. `2caa061` — 2026-06-03 · Add product bundle (combo) sales support

Introduces `ProductBundle` and `ProductBundleItem` models. Bundles appear in
the POS catalog alongside regular products and can be added to a sale; stock is
deducted from every component variant on completion. Includes a dialog for
creating bundles with a price and item list.

**Backend**
- `backend/app/models/product_bundle.rb` *(new)*
- `backend/app/models/product_bundle_item.rb` *(new)*
- `backend/app/models/sale.rb`
- `backend/app/models/sale_item.rb`
- `backend/app/controllers/api/v1/product_bundles_controller.rb` *(new)*
- `backend/app/controllers/api/v1/sales_controller.rb`
- `backend/app/services/invoice_service.rb`
- `backend/config/routes.rb`
- `backend/db/migrate/20260603130000_create_product_bundles.rb` *(new)*

**Frontend**
- `admin/src/pages/dashboard/products/ProductBundleDialog.tsx` *(new)*
- `admin/src/pages/dashboard/products/ProductsIndex.tsx`
- `admin/src/pages/dashboard/sales/PosIndex.tsx`
- `admin/src/pages/dashboard/sales/SaleDetailSheet.tsx`
- `admin/src/stores/productBundleStore.ts` *(new)*
- `admin/src/types/inventory.ts`

---

### 10. `3e65461` — 2026-06-03 · Fix ProductBundle UI: bundle list, icons, and combobox selector

Follow-up polish to the bundle feature: ProductsIndex gains a Combos section
below the products table with expandable rows and archive action. ProductCard
accepts an optional icon for contextual no-image placeholders (Boxes for
bundles, Zap for services). ProductBundleDialog replaces the native `<select>`
with a searchable Combobox.

**Frontend**
- `admin/src/pages/dashboard/products/ProductBundleDialog.tsx`
- `admin/src/pages/dashboard/products/ProductsIndex.tsx`
- `admin/src/pages/dashboard/sales/PosIndex.tsx`
- `admin/src/pages/dashboard/sales/ProductCard.tsx`
- `admin/src/stores/productBundleStore.ts`

---

### 11. `d27dff4` — 2026-06-03 · Add stock transfer feature between locations

Full feature for moving stock between warehouses/bodegas. A user creates a
transfer request; a user at the destination confirms receipt, which atomically
removes stock from the origin and adds it to the destination via
`StockMovement.apply!`. Both the requester and receiver are recorded.

**Backend**
- `backend/app/models/stock_transfer.rb` *(new)*
- `backend/app/models/stock_transfer_item.rb` *(new)*
- `backend/app/controllers/api/v1/stock_transfers_controller.rb` *(new)*
- `backend/config/routes.rb`
- `backend/db/migrate/20260604100000_create_stock_transfers.rb` *(new)*
- `backend/db/migrate/20260604100001_create_stock_transfer_items.rb` *(new)*
- `backend/db/schema.rb`

**Frontend**
- `admin/src/components/navigation/AppSidebar.tsx`
- `admin/src/pages/dashboard/transfers/CreateTransferModal.tsx` *(new)*
- `admin/src/pages/dashboard/transfers/TransferDetailSheet.tsx` *(new)*
- `admin/src/pages/dashboard/transfers/TransfersIndex.tsx` *(new)*
- `admin/src/routes/index.tsx`
- `admin/src/stores/transferStore.ts` *(new)*
- `admin/src/types/inventory.ts`

---

## What to EXCLUDE from main

These two commits are RysthDesign-specific and must stay on `clients/rysthdesign` only:

| Hash | Reason |
|------|--------|
| `e59c119` | `admin/index.html` has client branding in the `<title>` tag; `backend/db/seeds/production.rb` seeds client-specific admin credentials and business settings |
| `62e0946` | `docker-compose.prod.yml` contains client-specific domain names and environment variable values |

---

## How to apply

From a clean checkout of `main`, cherry-pick the 11 generic commits in order:

```bash
git checkout main
git pull origin main
git cherry-pick a3695ec 2000919 98a83cb 7313059 e8e370c d26cbc1 1bc38e6 8176c52 2caa061 3e65461 d27dff4
```

Resolve any conflicts, then push:

```bash
git push origin main
```

> **Note:** If you prefer a merge-based workflow, create a temporary branch from
> `clients/rysthdesign`, revert commits `e59c119` and `62e0946` on it, then
> open a PR into `main` from that branch.
