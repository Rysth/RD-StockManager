# Roadmap: Sistema de Inventario para Zapatería

> Demo funcional en 1 día — Rails 8 API + React 19 Admin

---

## Contexto

Cliente: vendedora de zapatos en Guayaquil que necesita automatizar su negocio.
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

- [ ] `rails db:migrate && rails db:seed` sin errores
- [ ] `/api/v1/inventory/stats` retorna métricas correctas
- [ ] `/api/v1/products` retorna productos con variantes anidadas
- [ ] Crear un zapato con tallas en el admin
- [ ] Registrar una venta completa (cliente + productos + completar)
- [ ] Verificar que el stock se descuenta al completar y se restaura al cancelar
- [ ] Ver reportes con datos generados por los seeds
- [ ] Sidebar muestra el grupo "Tienda" con todos los módulos
