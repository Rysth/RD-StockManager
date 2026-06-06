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

### Pending from `clients/rysthdesign` — SRI logo support and POS card sizing

Generic pieces that are safe to port to `main`, but should be applied carefully
because the client branch also contains RysthDesign-specific branding assets.

**Safe to include in `main`**
- Add logo support to the SRI gem RIDE renderer (`logo_data` / `logo_content_type` on `Emisor`, draw PNG/JPG in `Ride`).
- Pass the configured `Business.logo` into `InvoiceService` when generating the RIDE.
- Re-enable the business logo uploader in `BusinessSettings.tsx` so each tenant can update its own logo.
- Fix POS product cards to use fixed image/card heights so oversized product photos do not break the grid.

**Do not include in `main` as-is**
- RysthDesign default branding assets (`rysth_logo.png`) or default favicon/logo changes.
- Any fallback that hardcodes `rysth_logo.png` as the default RIDE logo.

**Files touched by the client-branch implementation**
- `admin/src/pages/dashboard/business/BusinessSettings.tsx`
- `admin/src/pages/dashboard/sales/ProductCard.tsx`
- `backend/app/services/invoice_service.rb`
- `sri_facturacion-gem/lib/sri_facturacion/models.rb`
- `sri_facturacion-gem/lib/sri_facturacion/ride.rb`

**Client-only branding files in the same work**
- `admin/index.html`
- `admin/public/rysth_logo.png`
- `admin/src/assets/rysth_logo.png`
- `backend/app/assets/images/rysth_logo.png`
- Admin default-logo imports and `InvoicesIndex.tsx` Rysth logo header

---

## Batch 2 — commits since `a256e87` (2026-06-03 → 2026-06-06)

A second wave of generic platform work landed after this document was first
written. Because these ~40 commits touch the same POS files repeatedly and
include a revert pair, they are best ported as a **single squash-merge** rather
than 40 ordered cherry-picks (see "How to apply"). They are grouped by theme;
every group is client-agnostic unless flagged. All touched config is ENV-driven
(no hardcoded client domains, credentials, or branding).

### A. POS architecture: split screens, shared hook & layout

The monolithic `sales/PosIndex.tsx` was split into dedicated screens plus a
shared cart hook; legacy `PosIndex.tsx` is removed by the end of the batch.

- Shared `usePosCart` hook and `shared/pos-helpers.tsx` (`money`, `Thumb`, `isServiceProduct`, `parseVariantLabel`, `CatalogItem`).
- `PosLayout.tsx` wrapper; routes split into `/dashboard/pos` (sales), `/dashboard/purchase-entry`, and a transfer POS.
- `SalesPosIndex`, `PurchasePosIndex`, `TransferPosIndex` (new): right-side variant drawer, denser card grid, "Vaciar" reset-with-confirmation, navigation blocker (no sessionStorage persistence), comboboxes for customer/supplier, editable unit prices.
- Commits: `436ef6e`, `19ea55c`, `b6e07ea`, `838e05c`, `2a567aa`, `327fa51`, `549224a`, `5e9fcd3`, `15c4d85`, `5168d74`, `2ed343d`, `e9a3796`, `7d38383`.

Key files: `admin/src/hooks/usePosCart.ts`, `admin/src/layouts/PosLayout.tsx`,
`admin/src/pages/dashboard/shared/pos-helpers.tsx`,
`admin/src/pages/dashboard/sales/SalesPosIndex.tsx`,
`admin/src/pages/dashboard/purchases/PurchasePosIndex.tsx`,
`admin/src/pages/dashboard/transfers/TransferPosIndex.tsx`,
`admin/src/pages/dashboard/sales/ProductCard.tsx`, `admin/src/routes/index.tsx`.

### B. POS pricing: per-item IVA, discounts & price history

- Per-item 15% IVA toggle on sales **and** purchases (replaces the earlier global per-sale rate); IVA is summed only over flagged lines and reflected in totals + the SRI RIDE.
- Per-item discounts in purchases; `ProductPriceHistory` records cost changes.
- Migrations: `add_discount_to_purchase_items`, `add_iva_fields_to_purchase_items`, `add_sri_iva_rate_to_sales`, `add_applies_iva_to_sale_items`.
- Commits: `654a340`, `c0828c3`, `8af6c7d`, `6d92428`, `c693119`.

Backend: `sale.rb`, `sale_item.rb`, `purchase.rb`, `purchase_item.rb`,
`product.rb`, `product_price_history.rb` (new), `sales_controller.rb`,
`purchases_controller.rb`, `invoice_service.rb`, the four migrations, `db/schema.rb`.
Frontend: `usePosCart.ts`, the POS screens, `saleStore.ts`, `types/inventory.ts`,
`SaleDetailSheet.tsx`.

> **Squash note:** `c693119` (global per-sale IVA rate) is **superseded** by
> `8af6c7d` (per-line `applies_iva`). Keep the per-line model when squashing.
> `6d92428` also bumps generic SMTP/Sidekiq config (timeouts, `SMTP_VERIFY_MODE`) — all ENV-driven.

### C. SRI invoicing hardening

- Public invoice verification endpoint (`api/v1/public/invoices`) + route + initializer.
- Store the SRI `.p12` certificate in Cloudflare R2 (ENV-configured, no client values).
- Block sale cancellation when an authorized production invoice exists.
- Redesigned invoice e-mail templates; fixed the verification URL.
- SRI gem bumps for RIDE page-break and logo layout (`Gemfile.lock`).
- Commits: `199591f`, `4de3a4b`, `4bdccf7`, `f3ee3d8`, `d5aeb7d`, `2e049e1`, `8578f05`, `07701b0`.

Backend: `public/invoices_controller.rb` (new), `business.rb`,
`businesses_controller.rb`, `sale.rb`, `invoice_service.rb`,
`config/initializers/sri_facturacion.rb`, `config/routes.rb`,
`app/views/invoice_mailer/authorized.{html,text}.erb`, `Gemfile.lock`.

> The generic SRI-logo-into-RIDE plumbing stays in the "Pending — SRI logo
> support" section above; only the Rysth asset/branding parts of `b017a7e` are excluded.

### D. Entity codes

Human-readable codes on Brand (`MRC-`), Category (`CAT-`), Customer (`CON-`) and
Location (`SUC-`), shown in their index tables alongside the existing Expense
(`GAS-`) and Sale (`VTA-`) codes.

- Commits: `6eca1f6`, `09dcce7`.
- Backend models + `brands/categories/customers/locations_controller.rb` serializers.
- Frontend: the four index pages + `ExpensesIndex.tsx` + `types/inventory.ts`.

### E. Admin list/CRUD polish & shared components

- Reusable `ArchivedToggle`, `EmptyState`, `FormField`, `RowActions`, `useFormErrors`, `toastUndo`; archive/restore workflows across Brands/Customers/Locations/Products.
- Combo (bundle) editing; hide contact credit fields.
- ProductsIndex: "Limpiar filtros", category dropdown limited to categories that have products, export fix.
- Commits: `bfdc479`, `2680b78`, `952e1ad`, `76839a8`, `2d7c0d7`.

### F. Role-based restrictions (`business_employee`)

- Block `business_employee` from editing completed sales.
- Hide the product cost column from `business_employee`.
- SalesIndex: lock the location filter to the employee's assigned branch and hide the seller filter (mirrors the backend's forced scoping).
- Commits: `bd32dac`, `2a6c38d`, `a101866`.

### G. Sidebar & layout polish

Redesigned `AppSidebar` (grouped sections whose labels hide on collapse, custom
hover-only scrollbar) + `index.css`. A collapsible-submenu experiment was
introduced and reverted — net effect is the final scrollbar/grouping design.

- Net commits: `4cfcdbd`, `c9e4e7b`, `b84eb70`, `6d10a0b` (skip the `800e7e6`/`89ac53d` revert pair).

### H. Product images & purchase filters

- Fix product image uploads (storage service, variant/product controllers).
- Hide service products in purchase mode.
- Commits: `b81f96b`, `ad533df`.

### I. Misc backend

- Fix development seed cleanup order (`74e31cd`).

---

## What to EXCLUDE from main

These commits are RysthDesign-specific and must stay on `clients/rysthdesign` only:

| Hash | Reason |
|------|--------|
| `e59c119` | `admin/index.html` has client branding in the `<title>` tag; `backend/db/seeds/production.rb` seeds client-specific admin credentials and business settings |
| `62e0946` | `docker-compose.prod.yml` contains client-specific domain names and environment variable values |
| `b017a7e` | Adds `rysth_logo.png` assets, client `<title>`/document-title branding, and a hardcoded Rysth default RIDE logo. **Port only** its generic SRI-logo plumbing (`invoice_service.rb` `logo_data`/`logo_content_type`) and the `BusinessSettings` logo uploader — see the "Pending — SRI logo support" section. |

---

## How to apply

### Batch 1 (the 11 commits, oldest → newest)

From a clean checkout of `main`, cherry-pick them in order:

```bash
git checkout main
git pull origin main
git cherry-pick a3695ec 2000919 98a83cb 7313059 e8e370c d26cbc1 1bc38e6 8176c52 2caa061 3e65461 d27dff4
```

Resolve any conflicts, then push.

### Batch 2 (commits since `a256e87`)

Do **not** cherry-pick these ~40 commits individually — they rewrite the same
POS files many times and include a revert pair, so a linear replay is highly
conflict-prone. Use a squash-merge instead:

```bash
# 1. Make a porting branch off the client branch's current tip
git checkout -b port/batch-2 clients/rysthdesign

# 2. Drop the branding-only commit's assets/title changes, keeping its
#    generic SRI-logo plumbing (see the b017a7e row above).
#    Easiest: leave b017a7e in, then revert just the branding files in a
#    follow-up commit, or manually unstage rysth_logo.png + index.html hunks.

# 3. Squash-merge the porting branch into main as one reviewable commit
git checkout main && git pull origin main
git merge --squash port/batch-2
#    Resolve conflicts, drop any client-only files, then:
git commit -m "Port generic platform work from clients/rysthdesign (batch 2)"
git push origin main
```

After merging, sanity-check that none of the excluded files landed:

```bash
git show --stat HEAD | grep -iE 'rysth_logo|index.html|seeds/production|docker-compose.prod' || echo "clean: no client-only files"
```

> **Tip:** Run `npx tsc --noEmit` (admin) and the backend migrations
> (`rails db:migrate`) on `main` after the squash to confirm parity before pushing.
