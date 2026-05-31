# Roadmap: EDLU Store — Sistema de Inventario y Ventas

> Demo funcional — Rails 8 API + React 19 Admin

---

## Contexto

Cliente: **EDLU Store** (Guayas-Guayaquil) — tienda que vende gorras, calzado y accesorios.
Contacto: storeedlu@gmail.com · WhatsApp +593983236580 · TikTok @edlu_store_ec.
Necesidades confirmadas: **control de inventarios** y **reportes de ventas**.

---

## Fase 1 — Backend: Base de Datos

**6 migraciones nuevas (en este orden):**

1. `create_categories` — categorías de zapatos (Mujer, Hombre, Niños, Deporte, Casual)
2. `create_products` — productos con marca, precio base, imagen, categoría
3. `create_product_variants` — variantes por talla + color con stock y SKU único
4. `create_customers` — clientes con nombre, teléfono, ciudad
5. `create_sales` — ventas con estado (pending / completed / cancelled), fecha, vendedor
6. `create_sale_items` — líneas de venta: variante × cantidad × precio unitario

---

## Fase 2 — Backend: Modelos

| Modelo | Responsabilidad clave |
|--------|-----------------------|
| `Category` | Clasificación de productos |
| `Product` | Zapato base con precio y marca |
| `ProductVariant` | Combinación talla+color, maneja stock. SKU auto-generado |
| `Customer` | Perfil del comprador |
| `Sale` | Transacción de venta. Al crearse descuenta stock; al cancelarse lo restaura |
| `SaleItem` | Línea de una venta. Valida que haya stock suficiente antes de guardar |

**Actualización en modelo existente:** `User` → agregar `has_many :sales`

---

## Fase 3 — Backend: Permisos

Agregar 5 claves nuevas al modelo `Permission` siguiendo el patrón existente:

| Clave | Descripción | Roles |
|-------|-------------|-------|
| `view_inventory` | Ver productos e inventario | admin, manager, operator |
| `manage_products` | CRUD de productos y categorías | admin, manager |
| `manage_customers` | CRUD de clientes | admin, manager, operator |
| `manage_sales` | Registrar y gestionar ventas | admin, manager, operator |
| `view_reports` | Acceder a reportes de ventas | admin, manager |

---

## Fase 4 — Backend: Controladores API

| Controlador | Ruta | Acciones |
|-------------|------|----------|
| `CategoriesController` | `/api/v1/categories` | CRUD completo |
| `ProductsController` | `/api/v1/products` | CRUD + `GET /low_stock` |
| `CustomersController` | `/api/v1/customers` | CRUD + búsqueda por nombre/teléfono |
| `SalesController` | `/api/v1/sales` | CRUD + `GET /report` |
| `InventoryController` | `/api/v1/inventory/stats` | Solo `GET stats` |

Todos siguen el mismo patrón del `UsersController` existente: autenticación, autorización por permiso, Ransack, Pagy, Redis cache.

**`SalesController#create`** usa transacción de base de datos: crea la venta, crea los items (que validan stock), y calcula el total.

**`SalesController#report`** devuelve:
- Resumen: ingresos hoy / semana / mes
- Ventas por día (últimos 30 días)
- Top 10 productos más vendidos
- Ingresos por mes (últimos 6 meses)

---

## Fase 5 — Backend: Seeds para Demo

Datos de demostración para impresionar a la clienta:

- 5 categorías
- 10 productos (Nike, Adidas, Puma, Converse, Skechers, Vans, Reebok, Crocs...)
- ~60 variantes (tallas 28–44, colores varios)
- 20 clientes con nombres y ciudades ecuatorianas reales
- 30 ventas distribuidas en los últimos 60 días (mix de estados)

---

## Fase 6 — Frontend: Nuevos Tipos y Permisos

- Crear `admin/src/types/inventory.ts` con interfaces para todos los nuevos modelos
- Agregar los 5 nuevos permisos al objeto `Permissions` en `admin/src/types/auth.ts`

---

## Fase 7 — Frontend: Zustand Stores

| Store | Archivo | Responsabilidad |
|-------|---------|-----------------|
| `useInventoryStore` | `stores/inventoryStore.ts` | Categorías, productos, stats de inventario |
| `useCustomerStore` | `stores/customerStore.ts` | Lista y CRUD de clientes |
| `useSaleStore` | `stores/saleStore.ts` | Ventas, crear venta, reporte |

Mismo patrón que el `userStore.ts` existente.

---

## Fase 8 — Frontend: Páginas Nuevas

### `/dashboard/products` — Inventario
- Tabla con TanStack Table
- Filas expandibles para ver variantes (talla / color / stock / SKU)
- Badge de stock: rojo "Sin Stock" / ámbar "Stock Bajo" / verde con cantidad
- Modal crear/editar con sección dinámica de variantes (agregar filas talla+color+stock)
- Filtros: búsqueda, categoría, activo/inactivo

### `/dashboard/customers` — Clientes
- Tabla con nombre, teléfono, ciudad
- Modal simple de crear/editar/eliminar

### `/dashboard/sales` — Ventas
- **Tab 1: Lista de ventas** — tabla con fecha, cliente, vendedor, total, estado (badge de color)
- **Tab 2: Nueva venta** — formulario:
  1. Búsqueda opcional de cliente
  2. Buscador de productos/variantes con stock disponible
  3. Carrito con cantidades editables y subtotales
  4. Botón "Completar Venta"

### `/dashboard/reports` — Reportes
- 4 cards de resumen (ingresos hoy, semana, mes, ventas hoy)
- `AreaChart` ventas por día — reutiliza componente existente
- `ComboChart` ingresos por mes — reutiliza componente existente
- Tabla top 10 productos más vendidos

---

## Fase 9 — Frontend: Archivos Existentes a Modificar

| Archivo | Cambio |
|---------|--------|
| `routes/index.tsx` | Agregar 4 rutas con `<ProtectedRoute>` |
| `components/navigation/AppSidebar.tsx` | Nuevo grupo "Tienda" con 4 items (condicionales por permiso) |
| `layouts/DashboardLayout.tsx` | Pasar nuevos permisos al sidebar, agregar breadcrumbs, actualizar `hasAccess` |
| `pages/dashboard/Dashboard.tsx` | Agregar fila de 4 stats cards de inventario (Productos, Stock Bajo, Clientes, Ingresos Hoy) |
| `backend/app/models/user.rb` | Agregar `has_many :sales` |

**Iconos nuevos a importar de Lucide:** `Package2`, `ShoppingCart`, `Users2`, `BarChart3`

---

## Secuencia del Día de Desarrollo

```
Horas 1–2   Migraciones + 6 modelos + actualizar User y Permission
Horas 2–4   Routes + 5 controladores (SalesController es el más complejo)
Hora 4:30   Seeds: rails db:seed — verificar counts
Horas 5–6   Types, permisos frontend, 3 stores Zustand
Horas 6–9   4 páginas (ProductsIndex es la más compleja por las variantes)
Horas 9–10  Sidebar + DashboardLayout + routes + Dashboard stats
Hora 10     Test E2E: producto → cliente → venta → reporte
```

---

## Verificación Final

- [x] `rails db:migrate && rails db:seed` sin errores
- [x] `/api/v1/inventory/stats` retorna métricas correctas
- [x] `/api/v1/products` retorna productos con variantes anidadas
- [x] Crear un zapato con tallas en el admin
- [x] Registrar una venta completa (cliente + productos + completar)
- [x] Verificar que el stock se descuenta al completar y se restaura al cancelar
- [x] Ver reportes con datos generados por los seeds
- [x] Sidebar muestra el grupo "Tienda" con todos los módulos

---

## Fase 10 — Mejoras Demo Cliente (multi-tenant ready)

> Segunda iteración: roles de negocio, trazabilidad, POS y catálogo administrable.

### 10.1 — Roles de negocio (reemplazan admin/manager/operator/user)

| Rol | Acceso |
|-----|--------|
| `admin` | Vendedor del software (yo). Acceso total, **incluye** gestión de usuarios. Sus cambios **no** se auditan. |
| `business_owner` | Dueño del negocio. Todo **excepto** gestión de usuarios. |
| `business_employee` | Empleado. Solo `view_inventory`, `manage_customers`, `manage_sales` (+ perfil). |

- `Permission#ROLE_DEFAULTS` reescrito. Seeds crean 1 admin, 1 owner, 2 empleados.
- Cuentas demo (password `password123`): `admin@example.com`, `owner@example.com`, `empleado1@example.com`, `empleado2@example.com`.
- UI de usuarios (crear/editar/filtros) actualizada a los nuevos roles.

### 10.2 — Auditoría / trazabilidad (gem `audited`)

- Tabla `audits`: registra cada create/update/destroy con el `user_id` que lo hizo.
- Modelos auditados: `Product`, `ProductVariant`, `Brand`, `Category`, `Customer`, `Sale`, `SaleItem`.
- `ApplicationController#with_audited_user`: atribuye el cambio al usuario actual y **desactiva** la auditoría cuando el actor es `admin`.
- Initializer `config/initializers/audited.rb` permite serializar `BigDecimal` en el YAML del audit.

### 10.3 — Sin borrado físico → archivar/inactivar

- `Product`, `Category`, `Brand`, `Customer`: `DELETE` ahora hace `active = false` (no se borra).
- Índices por defecto muestran solo activos; filtro `?archived=true` (o checkbox "Ver archivados") para consultarlos.
- Ventas: `DELETE` solo **cancela** (restaura stock), nunca elimina la fila.
- UI: botones "Eliminar" → "Archivar" (icono `Archive`) en productos, clientes, marcas y categorías.

### 10.4 — Marcas como entidad administrable

- Nuevo modelo `Brand` + `brand_id` en `products` (migrado desde el texto anterior).
- `BrandsController` (CRUD), gestionable por admin/business_owner (`manage_products`).
- SKU de variantes y reportes (top productos) usan la relación `brand`.

### 10.5 — Importación masiva de productos (Excel)

- `ProductImportService`: genera plantilla `.xlsx` (gem `caxlsx`) y lee archivos (gem `roo`).
- `GET /api/v1/products/import_template` y `POST /api/v1/products/import`.
- Cada fila = una variante (producto, marca, categoría, precios, talla, color, stock). Marcas/categorías nuevas se crean al vuelo.
- UI: modal "Importar Excel" en Inventario (descargar plantilla + subir + resumen de resultados).

### 10.6 — POS rediseñado + método de pago

- Tab "Nueva venta" rediseñado: grilla de productos (cards con imagen, precio, stock) + filtro por categoría + panel de checkout sticky.
- Al completar: selector **Efectivo / Transferencia** + checkbox **"Pago contra entrega"**.
- `sales.payment_method` (enum cash/transfer) y `sales.cash_on_delivery` (boolean). Se muestran en el detalle de la venta.

### 10.7 — El Dashboard ahora son los Reportes

- `/dashboard` (home) renderiza los Reportes de ventas. Se elimina el item/route duplicado de "Reportes".
- Usuarios sin `view_reports` (business_employee) son redirigidos a `/dashboard/sales`.
- Sidebar: nuevo item "Marcas y Categorías" (gateado por `manage_products`) en el grupo Tienda.

### Verificación Fase 10

- [x] `bundle install && rails db:migrate && rails db:seed` sin errores
- [x] Login por rol: admin ve Usuarios; owner no; empleado solo ventas/clientes/inventario
- [x] Cambios de owner quedan en `audits`; cambios de admin **no**
- [x] "Eliminar" producto/cliente → queda `active=false`, consultable como archivado
- [x] Crear marca y asignarla a un producto; gestionar categorías
- [x] Descargar plantilla Excel e importar productos + variantes
- [x] POS: elegir Transferencia + contra entrega, completar venta (stock baja, pago registrado)
- [x] Home (`/dashboard`) muestra Reportes
- [x] `npm run build` del admin sin errores de tipos

---

## Fase 11 — Pulido para Demo: Skeletons, Cache, EDLU Store y Productos Genéricos

### 11.1 — Skeleton loaders en todas las páginas de listado

Cada página de listado muestra un skeleton animado (`animate-pulse`) durante la primera carga,
en vez de la pantalla en blanco anterior. Patrón: `if (isLoading && firstLoad) return <PageSkeleton />;`

| Página | Skeleton añadido |
|--------|-----------------|
| `ProductsIndex` | Encabezado + 6 filas de tabla con thumb/nombre/precio/stock |
| `BrandsIndex` | Encabezado + 5 filas de tabla marcas/categorías |
| `CustomersIndex` | Encabezado + 6 filas de tabla nombre/teléfono/ciudad |
| `SalesIndex` (tab lista) | 6 filas de tabla fecha/cliente/total/estado |

### 11.2 — Cache `inventory:stats` corregido en todos los controladores

Antes, crear/editar/archivar categorías y clientes no invalidaba el cache del widget del Dashboard.

| Controlador | Antes | Después |
|-------------|-------|---------|
| `CategoriesController` | ❌ Sin cache clear | ✅ `after_action :clear_inventory_cache, only: [:create, :update, :destroy]` |
| `CustomersController` | ❌ Sin cache clear | ✅ Ídem |
| `BrandsController` | ❌ Sin cache clear | ✅ Ídem |

### 11.3 — EDLU Store: datos del negocio

- Migración: `add_email_and_location_to_businesses` (columnas `email`, `location`).
- `Business.current` ahora crea EDLU Store por defecto en bases de datos nuevas.
- Seeds actualizan la fila existente: nombre, slogan, whatsapp, tiktok, email, location.
- `admin/index.html` título: **"EDLU Store | Powered By RysthDesign"**.
- **Logo**: subir manualmente desde Settings → Negocio (no se incluye en seeds).
- Controladores `BusinessesController` y `Public::BusinessesController` exponen `email` y `location`.

### 11.4 — Productos genéricos (gorras, calzado y accesorios)

La plataforma ya era 100% genérica (categorías/marcas/variantes sin restricciones).
Seeds actualizados para demostrar versatilidad:

- 7 categorías: Mujer, Hombre, Niños, Deporte, Casual, **Gorras**, **Accesorios**.
- 10 marcas de calzado + **New Era** y **Volcom** (gorras).
- 12 productos: 10 calzado + 2 gorras (**9FORTY Adjustable**, **Full-Zip Logo Cap**) con tallas S/M/L.

### Verificación Fase 11

- [x] `rails db:migrate && rails db:seed` sin errores
- [x] Business actualizado: nombre "EDLU Store", TikTok "edlu_store_ec", email y location guardados
- [x] Navegar a Inventario/Clientes/Ventas → skeleton visible antes de la tabla
- [x] Crear categoría → widget "Total Categorías" en Dashboard se actualiza al refrescar
- [x] Crear cliente → widget "Clientes" en Dashboard se actualiza
- [x] Seeds incluyen gorras con tallas S/M/L — se pueden gestionar igual que zapatos
- [x] `npm run build` sin errores de tipos

---

## Fase 12 — Multi-ubicación: Ubicaciones / Almacenes + Stock por ubicación

> Primer paso de la evolución a ERP genérico (estilo Kosari / UltimatePOS). Convierte el stock
> de un entero único por variante a un modelo por ubicación, base de Compras y Reportes futuros.

### 12.1 — Modelo de datos

- Migraciones: `create_locations` (`name`, `address`, `phone`, `is_default`, `active`),
  `create_stock_levels` (`product_variant_id` × `location_id` único, `quantity`),
  `add_location_to_sales` (`sales.location_id`), `backfill_locations_and_stock` (crea
  **"Principal"**, copia `product_variants.stock` → `stock_levels` y asigna ventas históricas).
- **Diseño clave:** `product_variants.stock` se conserva como **total denormalizado** (suma de
  todas las ubicaciones), así los scopes/queries agregados existentes siguen intactos. El detalle
  por ubicación vive en `stock_levels`.

### 12.2 — Modelos y lógica

- `Location` (audited, scope `active`, garantiza un solo `is_default`, `Location.default`).
- `StockLevel` (variante × ubicación, único).
- Servicio `StockMovement.apply!(variant:, location:, delta:)`: ajusta el `StockLevel` con bloqueo,
  valida que no quede negativo y resincroniza el total denormalizado vía `update_column`.
- `ProductVariant`: `stock_for(location)`, `low_stock_at(location_id)`, callbacks que crean el
  `StockLevel` inicial y reconcilian la ubicación por defecto al editar el stock desde el formulario.
- `Sale#complete!`/`#cancel!` mueven stock en `sale.location` vía `StockMovement`.
  `SaleItem#sufficient_stock` valida contra el stock de esa ubicación. Las ventas obtienen la
  ubicación por defecto si no se especifica.

### 12.3 — Permisos y API

- Nuevos permisos `view_locations`, `manage_locations` (admin + owner; empleado solo ver).
- `LocationsController` (CRUD, archiva en vez de borrar, impide archivar la única activa).
- `sales#create` acepta `location_id`; `sales#report`, `products#low_stock` e `inventory#stats`
  aceptan `?location_id=` para filtrar por sucursal.

### 12.4 — Frontend

- Tipos `Location` / `VariantStockLevel`, `useLocationStore`, página `/dashboard/locations`
  e ítem "Ubicaciones" (icono `Warehouse`) en el grupo Tienda.
- POS: selector de ubicación (visible con >1 sucursal), enviado al registrar la venta y mostrado
  en el diálogo de confirmación.
- Inventario: desglose de stock por ubicación en la fila expandible de variantes.

### 12.5 — Seeds

- 2 ubicaciones (**Tienda Principal** por defecto + **Bodega Norte**); ~40% de las variantes
  reciben stock extra en la bodega para demostrar el inventario multi-ubicación.

### Verificación Fase 12

- [x] `rails db:migrate` migra el stock existente a "Principal" sin pérdida (0 desajustes)
- [x] `rails db:seed` sin errores: 2 ubicaciones, 97 niveles de stock, 30 ventas con ubicación
- [x] Vender desde una ubicación descuenta su stock; cancelar lo restaura (probado vía runner)
- [x] Vender desde una ubicación sin stock falla la validación
- [x] `inventory/stats`, `products/low_stock` y `sales/report` filtran por `location_id`
- [x] owner tiene `manage_locations`; empleado no
- [x] Build admin verificado con `npx tsc -b && npx vite build --outDir /tmp/opencode/rdstock-admin-dist`

---

## Fase 13 — Compras, Proveedores, Gastos, Contactos enriquecidos e Informes avanzados

> Cierra el ciclo de inventario (entra mercancía vía compras), agrega gastos y deudas, y completa
> los informes faltantes del modelo Kosari/UltimatePOS. Reutiliza el patrón `Sale`/`StockMovement`.

### 13.1 — Contactos enriquecidos
- `Customer` extendido (migración `add_contact_fields_to_customers`): `is_customer`, `is_supplier`,
  `email`, `credit_limit`, `payment_term_days`. Un proveedor es un `Customer` con `is_supplier`.
- Saldos **calculados**: `receivable` (ventas completadas − pagado), `payable` (compras recibidas −
  pagado), `balance`. `CustomersController` acepta `?role=customer|supplier` y serializa saldos.
- UI: `CustomersIndex` → "Contactos" con tabs Clientes/Proveedores/Todos, columnas de saldo, flags
  cliente/proveedor, email, límite de crédito y plazo de pago.

### 13.2 — Compras + Proveedores
- Migraciones `create_purchases` (proveedor, ubicación, estado draft/received/cancelled,
  payment_status due/partial/paid, fechas, subtotal/descuento/impuesto/total/pagado) y `create_purchase_items`.
- `Purchase` (espejo de `Sale`): `receive!` suma stock vía `StockMovement`, `cancel!` revierte;
  al recibir actualiza el costo del producto (last cost). `PurchasesController` CRUD + `receive` + `due`.
- Permisos `view_purchases`/`manage_purchases` (admin + owner). UI: `PurchasesIndex` (lista +
  formulario con proveedor, ubicación, líneas de variantes, descuento/impuesto, vencimiento) +
  `purchaseStore`. Sidebar "Compras" (icono `Truck`).

### 13.3 — Gastos
- Migraciones `create_expense_categories`, `create_expenses` (categoría, ubicación, monto, fecha,
  método de pago). Modelos `Expense`/`ExpenseCategory`. Controladores CRUD (categoría archiva).
- Permisos `view_expenses`/`manage_expenses`. UI: `ExpensesIndex` (lista + crear + gestión de
  categorías + filtro) + `expenseStore`. Sidebar "Gastos" (icono `Receipt`).

### 13.4 — Pagos / saldos y alertas
- `add_credit_fields_to_sales`: `paid_amount`, `payment_status`, `due_date`. `Sale#complete!` marca
  pagada la venta POS al contado (COD queda `due`). Scopes `due_soon` en `Sale` y `Purchase` (≤ 7 días).

### 13.5 — Informes avanzados
- `ReportsController` (`/api/v1/reports/...`): `purchases`, `taxes` (IVA 15% Ecuador), `contacts`,
  `expenses`, `cash_register`, `sales_reps`. UI: `AdvancedReportsIndex` en `/dashboard/reports` con
  6 sub-tabs + `reportStore`. Sidebar "Informes" (icono `BarChart3`, gateado por `view_reports`).

### 13.6 — Seeds
- 5 proveedores, 5 categorías de gasto + ~18 gastos, ~12 compras recibidas (suben stock) con algunas
  a crédito y `due_date` próximo para demostrar las alertas de vencimiento.

### Verificación Fase 13
- [x] `rails db:migrate && rails db:seed` sin errores (5 proveedores, 12 compras, 18 gastos)
- [x] Recibir compra sube stock (30→40); cancelar lo restaura (40→30) — probado vía runner
- [x] Costo del producto se actualiza al recibir (last cost)
- [x] `Purchase.due_soon` y ventas COD `due` aparecen como pendientes de pago
- [x] Los 6 reportes devuelven datos reales; endpoints responden 401 sin auth (controladores cargan)
- [x] owner tiene `manage_purchases`/`manage_expenses`; empleado no
- [x] `npm run build` del admin sin errores de tipos

---

## Fase 14 — Pulido POS: envío, combobox, export, nómina y sucursal por empleado

> Ajustes finos pedidos tras la demo de Compras/Gastos. Mejoran la operación diaria del POS y
> cierran detalles del modelo Kosari.

### 14.1 — Costo de envío en ventas
- Migración `add_shipping_cost_to_sales` (`shipping_cost`). `Sale#recalculate_total!` suma el envío
  al total; el pago al contado registra el total con envío.
- POS: botones **Gratis / $3 / Otro**, subtotal + envío + total en carrito, confirmación y recibo.
- `SalesIndex`: línea de envío en el detalle.

### 14.2 — Reimprimir ticket
- Generador de ticket 80mm extraído a util compartido `lib/ticket.ts` (POS + detalle de venta).
- Botón **"Reimprimir ticket"** en el panel de detalle de `SalesIndex`.

### 14.3 — POS por ubicación
- Al cambiar de sucursal, el catálogo muestra solo variantes con stock **en esa ubicación**
  (usa `stock_by_location`); el máximo del carrito respeta ese stock. Corrige bug: `saleStore`
  no enviaba `location_id`.

### 14.4 — Exportar inventario a Excel
- `ProductExportService` (Axlsx) + `GET /products/export?location_id=`. Botón **Exportar** en
  Inventario (general o por ubicación) con producto, marca, categoría, SKU, talla, color, precios y stock.

### 14.5 — Combobox + crear producto desde compras
- Componente reutilizable `components/ui/combobox.tsx` (sobre Radix Popover, sin deps nuevas) y
  `popover.tsx`. En Compras reemplaza el `<select>` por búsqueda con autocompletar.
- Acción **"Crear producto nuevo"** en el combobox → diálogo rápido que crea producto + variante y
  lo agrega a la compra (el stock entra al recibir).

### 14.6 — Gastos de nómina por empleado
- `expense_categories.is_payroll` + `expenses.employee_id`. Al elegir la categoría **Sueldos**
  aparece el selector de empleado (obligatorio); si ya hay sueldo ese mes muestra **warning** pero
  permite registrarlo. Endpoints `expenses/employees` y `expenses/salary_status`.

### 14.7 — Empleados restringidos a su sucursal
- Migración `add_location_to_users` (`location_id`). `User#restricted_to_location?` (empleado con
  sucursal asignada). `me` expone la sucursal; `SalesController#create` **fuerza** la ubicación del
  empleado restringido. POS bloquea el selector (badge fijo); formularios de usuario asignan sucursal.

### 14.8 — Sidebar reordenado por flujo
- Grupo Tienda en orden lineal del negocio: **Contactos → Compras → Inventario → Marcas y Categorías
  → Ubicaciones → Punto de Venta → Ventas → Gastos → Informes**.

### Verificación Fase 14
- [x] `rails db:migrate && rails db:seed` sin errores
- [x] Venta con envío $3 → total incluye envío; al contado queda pagada
- [x] Reimprimir ticket desde una venta existente
- [x] POS por sucursal muestra solo stock de esa ubicación
- [x] Export Excel general y por ubicación
- [x] Combobox de producto + crear producto al vuelo en compras
- [x] Sueldo a empleado con warning si ya existe ese mes (permite igual)
- [x] Empleado1 (Tienda Principal) no puede vender desde otra sucursal — se fuerza la suya
- [x] `npm run build` del admin sin errores de tipos

---

## Fase 15 — Facturación electrónica SRI Ecuador

> Integra emisión de facturas electrónicas para ventas completadas usando la gema local
> `sri_facturacion`, derivada de `open-api-facturacion-sri`.

### 15.1 — Gema local y configuración
- La gema se reubicó en `backend/vendor/gems/sri_facturacion` y el `Gemfile` la carga por path.
- `backend/config/initializers/sri_facturacion.rb` lee `SRI_AMBIENTE`, `SRI_CERT_PATH`,
  `SRI_CERT_PASSWORD`, `SRI_MAX_RETRIES` y `SRI_RETRY_DELAY`.
- Docker y `.env.example` documentan el certificado `.p12` dentro del contenedor
  (`/rails/storage/sri_certs/certificado.p12`).

### 15.2 — Backend Rails
- Nuevos campos SRI en `Business`: RUC, razón social, dirección matriz/establecimiento,
  establecimiento, punto de emisión y leyendas tributarias.
- Nuevo modelo `Invoice`: guarda clave de acceso, estado SRI, XML firmado/autorizado, RIDE PDF,
  mensajes, comprador e importe total.
- `InvoiceService` emite facturas para ventas completadas, reserva secuenciales de forma atómica y
  persiste errores locales sin romper la API.
- Rutas en ventas: `POST /sales/:id/invoice`, `GET /sales/:id/invoice_xml`,
  `GET /sales/:id/invoice_ride`.
- Permiso `manage_invoicing` para admin/business_owner.

### 15.3 — Frontend admin
- Configuración → Negocio permite cargar los datos legales SRI del emisor.
- Ventas muestra el estado de factura en la tabla; las acciones de facturar, descargar XML/RIDE,
  confirmar entrega y cancelar viven en el drawer de detalle para evitar acciones accidentales.
- Antes de emitir se muestra un modal de confirmación con feedback de autorización: firma XML,
  envío al SRI y espera de autorización.

### 15.4 — RIDE y correo al cliente
- RIDE rediseñado con encabezado fiscal, caja de autorización, QR separado, tabla de detalle,
  bloque de totales y pie **StockManager by RysthDesign**.
- Si la factura queda autorizada y el cliente tiene email, `InvoiceMailer` envía XML autorizado y
  RIDE PDF adjuntos. Consumidor final o clientes sin email no reciben correo.

### 15.5 — Performance y limpieza
- `ExpensesController#index/show` carga `employee` para eliminar el warning de eager loading.
- `SalesController` usa cargas separadas para detalle, emisión y descargas, evitando includes
  innecesarios en acciones de facturación.

### Verificación Fase 15
- [x] `rails db:migrate` crea campos SRI e `invoices`
- [x] Configurar `.env` con certificado `.p12` válido y contraseña
- [x] Emitir factura SRI en ambiente de pruebas (`SRI_AMBIENTE=1`)
- [x] Descargar XML autorizado y RIDE desde `/dashboard/sales`
- [x] `npm run build` del admin sin errores de tipos

---

## Alineación con Kosari / UltimatePOS

> Estado de las funciones del POS de Kosari frente a lo implementado.
> ✅ Listo · 🟡 Parcial · ❌ No implementado

### Múltiples negocios/tiendas — ❌
| Función | Estado | Nota |
|---------|--------|------|
| Configurar múltiples negocios | ❌ | `Business` es singleton (un negocio por despliegue) |
| Sin restricción en número de empresas | ❌ | No hay multi-tenancy |
| Inventario/contabilidad separados por negocio | ❌ | Fuera de alcance; la multi-ubicación cubre la necesidad real de EDLU |

### Ubicación / tiendas / almacén — 🟡 (Fase 12 + 14)
| Función | Estado | Nota |
|---------|--------|------|
| Crear múltiples ubicaciones | ✅ | `Location`, `/dashboard/locations` |
| Gestionarlas todas a la vez | ✅ | Stock por variante × ubicación |
| Existencias/compras/ventas por ubicación | ✅ | Stock, compras con ubicación destino, ventas por sucursal; empleados restringidos a su sucursal |
| Personalizar diseño/factura por ubicación | ❌ | Recibo 80mm global, no configurable por UI |

### Usuarios y roles — 🟡 (Fase 10)
| Función | Estado | Nota |
|---------|--------|------|
| Sistema de usuarios y roles | ✅ | `Permission` + Rolify |
| Roles predefinidos (admin/cajero) | ✅ | admin, business_owner, business_employee |
| Crear roles personalizados con permisos | ❌ | Roles fijos en código (`ROLE_DEFAULTS`) |
| Usuarios ilimitados | ✅ | CRUD en `/dashboard/users` |

### Contactos (Clientes y Proveedores) — ✅ (Fase 13.1)
| Función | Estado | Nota |
|---------|--------|------|
| Marcar cliente / proveedor / ambos | ✅ | Flags `is_customer` / `is_supplier` |
| Ver detalles de transacciones con un contacto | 🟡 | Reporte de contactos con totales y última transacción; sin historial línea por línea |
| Ver saldo crédito/débito | ✅ | `receivable` / `payable` / `balance` |
| Plazo de pago + alerta una semana antes | ✅ | `payment_term_days` + `due_soon` (≤ 7 días) |

### Productos — 🟡
| Función | Estado | Nota |
|---------|--------|------|
| Productos individuales y variables | ✅ | `Product` + `ProductVariant` |
| Clasificar por Marca, Categoría, Subcategoría | 🟡 | Marca + categoría ✅; **subcategoría** ❌ |
| Productos con diferentes unidades (UOM) | ❌ | Sin unidad de medida |
| SKU manual o auto con prefijo | ✅ | Auto-generado con prefijo |
| Alertas de stock bajo | ✅ | Umbral 5, por ubicación |
| Cálculo automático de precio venta (costo + margen) | 🟡 | Muestra margen estimado; no calcula el precio desde el margen |
| Plantillas de variación reutilizables | ❌ | Se escriben variantes cada vez |

### Compras — ✅ (Fase 13.2 + 14.5)
| Función | Estado | Nota |
|---------|--------|------|
| Añadir compras fácilmente | ✅ | Con combobox + crear producto al vuelo |
| Compra para diferentes ubicaciones | ✅ | Ubicación destino por compra |
| Gestionar pagadas/vencidas | ✅ | `payment_status`, saldo por pagar |
| Notificación de compras vencidas (1 semana antes) | ✅ | `Purchase.due_soon` |
| Añadir descuentos e impuestos | ✅ | Descuento + impuesto en la compra |

### Vender — ✅ (Fase 10.6 + 14)
| Función | Estado | Nota |
|---------|--------|------|
| Interfaz simplificada | ✅ | POS con grilla + checkout |
| Cliente Walk-In por defecto | ✅ | "Consumidor final" |
| Agregar cliente desde POS | ✅ | Diálogo rápido |
| Venta basada en Ajax | ✅ | Sin recargas |
| Factura borrador o final | ✅ | `pending` / `completed` |
| Diferentes opciones de pago | ✅ | Efectivo / transferencia + contra entrega + **costo de envío** |
| Personalizar diseño/factura | 🟡 | Ticket 80mm imprimible/reimprimible; no configurable por UI |

### Administrar gastos — ✅ (Fase 13.3 + 14.6)
| Función | Estado | Nota |
|---------|--------|------|
| Agregar gastos fácilmente | ✅ | `/dashboard/expenses` |
| Categorizar gastos | ✅ | Categorías + nómina por empleado |
| Analizar por categoría y ubicación (informe) | ✅ | Reporte de gastos |

### Informes — 🟡 (Fase 13.5)
| Función | Estado | Nota |
|---------|--------|------|
| Informe de compra y venta | ✅ | Ventas + compras |
| Informe fiscal | ✅ | IVA cobrado vs pagado |
| Informes de contacto | ✅ | Saldos y última transacción |
| Informe de acciones (stock) | 🟡 | Stats de inventario + export Excel por ubicación; sin reporte de valuación dedicado |
| Informe de gastos | ✅ | Por categoría / ubicación |
| Productos en tendencia (marca/categoría/subcategoría/unidad/fechas) | 🟡 | Top productos por marca/categoría; sin subcategoría/unidad ni rango de fechas configurable |
| Informe de caja registradora | ✅ | Flujo de efectivo |
| Informe del representante de ventas | ✅ | Por vendedor (`Sale.user`) |

### Resumen de brechas restantes
- **Multi-negocio (multi-tenant)** — decisión consciente de no implementar (no necesario para EDLU).
- **Productos:** subcategorías, unidades de medida (UOM), plantillas de variación, precio automático por margen.
- **Personalización de factura por UI / por ubicación.**
- **Roles personalizables desde la UI.**
- **Reportes:** valuación de stock dedicada y tendencias por subcategoría/unidad con rango de fechas.
