# StockManager by RysthDesign

Sistema full-stack para administrar inventario, ventas, compras, gastos, reportes y facturacion electronica SRI Ecuador. Incluye API Rails 8, panel administrativo React 19, worker Sidekiq, PostgreSQL y Redis.

## Caracteristicas

- POS con creacion rapida de cliente (requiere telefono + email), edicion inline desde el badge de cliente seleccionado y reimpresion de ticket.
- Ventas completadas, pedidos contra entrega con edicion de productos antes de completar y control de stock.
- Inventario por productos, marcas, categorias, variantes, imagenes y stock por ubicacion.
- Compras a proveedores con recepcion de mercaderia, costos y saldos por pagar.
- Gastos operativos y nomina por empleado.
- Contactos enriquecidos: clientes, proveedores, saldos por cobrar/pagar y datos fiscales.
- Reportes de ventas, compras, impuestos, caja, gastos, contactos y representantes de venta.
- Facturacion electronica SRI en ambiente pruebas/produccion con XML autorizado y RIDE PDF.
- Envio opcional de factura por email al cliente con XML y RIDE adjuntos.
- Roles de negocio: admin, dueno del negocio y empleado restringido por sucursal.
- Filtros combinados en listados: Ventas (estado, ubicacion, vendedor), Compras (estado, pago, ubicacion), Gastos (categoria, ubicacion).
- Permisos granulares: solo admin y business_owner pueden emitir facturas SRI.
- Auditoria de cambios con trazabilidad por usuario.

## Filtros en listados

Cada listado del panel incluye filtros combinados (`<select>`) que se aplican via Ransack al backend:

| Listado    | Filtros disponibles                              |
|------------|--------------------------------------------------|
| Ventas     | Estado, ubicacion, vendedor (business_owner/employee, sin admin) |
| Compras    | Estado, estado de pago, ubicacion                |
| Gastos     | Categoria, ubicacion                             |

Cada filtro incluye un boton **Limpiar filtros** que aparece solo cuando hay al menos un filtro activo, devolviendo la vista al estado por defecto.

Los filtros persisten en la paginacion y se reflejan en la URL de la API via parametros Ransack (`status_eq`, `location_id_eq`, `user_id_eq`, etc.).

## Editar productos en ventas pendientes

Las ventas en estado **pendiente** (contra entrega) permiten modificar cantidades y precios unitarios de sus productos desde el drawer de detalle:

1. Abre la venta pendiente en `Ventas`.
2. Haz clic en **Editar productos**.
3. En el modal, ajusta cantidades o precios, o elimina productos (cantidad 0).
4. Confirma **Guardar cambios** — el total se recalcula automaticamente via `PUT /api/v1/sales/:id/sync_items`.

Esto evita descuadrar el stock: solo se descuenta al completar la venta (`Sale#complete!`), no al crear el pedido.

## Permisos de facturacion SRI

La emision de facturas electronicas esta restringida por permiso `manage_invoicing`:

| Rol              | Puede emitir facturas |
|------------------|-----------------------|
| admin            | Si                    |
| business_owner   | Si                    |
| business_employee| No                    |

Los empleados no ven la seccion de facturacion en el drawer de detalle de venta.

## Inicio Rapido

### Requisitos

- Docker y Docker Compose
- Git

### Levantar el entorno

```bash
chmod +x setup.sh
./setup.sh
```

Servicios principales:

- Admin: `http://localhost:5173`
- API Rails: `http://localhost:3001`
- Letter Opener: `http://localhost:3001/letter_opener`
- Sidekiq: `http://localhost:3001/sidekiq`
- Storefront opcional: `http://localhost:4321`

## Facturacion Electronica SRI

La facturacion electronica es opcional y queda desactivada por defecto en cada negocio. Los valores `.env` siguen disponibles como respaldo local/desarrollo:

```env
SRI_AMBIENTE=1
SRI_CERT_PATH=/rails/storage/sri_certs/certificado.p12
SRI_CERT_PASSWORD=tu_clave_local
SRI_MAX_RETRIES=3
SRI_RETRY_DELAY=2
```

Desde el admin tambien se puede cargar el certificado `.p12/.pfx` en `Configuracion > Negocio > Facturacion SRI`. Si usas el respaldo `.env`, el certificado debe vivir localmente en:

```txt
backend/storage/sri_certs/certificado.p12
```

No subas certificados ni claves al repositorio. Los archivos `.p12` y `.pfx` estan ignorados por git.

Para emitir una factura:

1. Como admin, activa la facturacion SRI del negocio, configura ambiente y carga certificado/clave.
2. Configura los datos legales en `Configuracion > Negocio > Facturacion SRI`.
3. Registra una venta completada desde el POS.
4. Abre la venta en `Ventas`.
5. Desde el drawer de detalle, confirma `Emitir factura SRI`.
6. Descarga XML/RIDE cuando quede autorizada.

Si SRI esta desactivado, el flujo de ventas sigue funcionando con nota de venta/ticket 80mm.

Si el cliente tiene email, el sistema envia automaticamente el XML autorizado y RIDE PDF adjuntos.

## Comandos Utiles

```bash
# Levantar desarrollo
docker compose -f docker-compose.dev.yml up -d

# Reconstruir
docker compose -f docker-compose.dev.yml up --build -d

# Migraciones
docker compose -f docker-compose.dev.yml exec api bundle exec rails db:migrate

# Seeds
docker compose -f docker-compose.dev.yml exec api bundle exec rails db:seed

# Logs
docker compose -f docker-compose.dev.yml logs -f api

# Build admin
cd admin && npm run build

# Specs de la gema SRI
cd backend/vendor/gems/sri_facturacion && bundle exec rspec
```

## Estructura

```txt
admin/        Panel administrativo React + TypeScript + Vite
backend/      API Rails 8, Sidekiq, facturacion SRI y servicios de negocio
mobile/       App Expo opcional
storefront/   Storefront Astro opcional
docker-compose.dev.yml
docker-compose.yml
ROADMAP.md
```

## Branding

Producto: **StockManager by RysthDesign**.

Creado por [RysthDesign](https://rysthdesign.com/).
