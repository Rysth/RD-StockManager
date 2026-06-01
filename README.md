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

La facturacion electronica (Ecuador) es **opcional** y queda **desactivada por defecto en cada negocio**. La emision usa la gema local `backend/vendor/gems/sri_facturacion` (Ruby puro: clave de acceso, XML 1.1.0, firma XAdES-BES, envio SOAP al SRI y generacion del RIDE en PDF).

La configuracion se hace de dos formas. La **UI por negocio es la fuente principal**; el `.env` queda como respaldo de desarrollo.

### A) Configuracion por negocio (recomendada, desde el admin)

Toda la configuracion vive en `Configuracion > Negocio > Facturacion SRI`. Solo el rol **admin** puede activar SRI, elegir ambiente y subir/cambiar el certificado; un **business_owner** con permiso puede editar los datos legales pero no la activacion ni el certificado.

1. **Datos legales del emisor** (obligatorios para emitir):
   - RUC (13 digitos)
   - Razon social
   - Direccion matriz
   - Establecimiento (`001`) y punto de emision (`001`)
   - Obligado a llevar contabilidad (SI/NO) y leyendas opcionales (contribuyente especial, RIMPE)
2. **Certificado de firma**: sube el archivo `.p12`/`.pfx` y su clave.
   - El certificado se guarda en `backend/storage/sri_certs/` con permisos `0600`.
   - La clave se almacena **cifrada (AES-256-GCM)**; no se muestra ni se imprime.
3. **Ambiente**: `1` = Pruebas (default) · `2` = Produccion. **Prueba siempre primero en ambiente 1.**
4. **Activa** la casilla de facturacion SRI.

> ⚠️ **Critico:** el **RUC del emisor debe coincidir con el RUC para el que se emitio el certificado** `.p12`. Si no coinciden, el SRI rechaza el comprobante (DEVUELTA / NO AUTORIZADO).

El sistema solo permite emitir cuando el negocio esta "listo" (`sri_ready?`): SRI activado + datos legales completos + certificado y clave cargados. Si falta algo, la UI lista los requisitos pendientes.

### B) Respaldo por variables de entorno (desarrollo)

Si prefieres no usar la UI, puedes configurar el certificado global via `.env` (ver `.env.example` y `backend/config/initializers/sri_facturacion.rb`):

```env
SRI_AMBIENTE=1
SRI_CERT_PATH=/rails/storage/sri_certs/certificado.p12
SRI_CERT_PASSWORD=tu_clave_local
SRI_MAX_RETRIES=3
SRI_RETRY_DELAY=2
```

`SRI_CERT_PATH` es la ruta **dentro del contenedor**; coloca el archivo localmente en `backend/storage/sri_certs/certificado.p12`. La configuracion por negocio tiene prioridad: el `.env` solo se usa como valor por defecto cuando el negocio no tiene su propio certificado/ambiente.

> **Seguridad:** no subas certificados ni claves al repositorio. Los archivos `.p12` y `.pfx` estan ignorados por git.

### Emitir una factura

1. Confirma que el negocio tiene SRI activado y los datos legales/certificado cargados (paso A).
2. Registra una venta **completada** desde el POS.
3. Abre la venta en `Ventas` y, en el drawer de detalle, confirma **Emitir factura SRI** (permiso `manage_invoicing`: admin y business_owner).
4. El modal muestra el progreso: firma del XML, envio al SRI y espera de autorizacion. Un rechazo muestra `mensaje` e `informacion_adicional` del SRI.
5. Cuando queda **AUTORIZADA**, descarga el **XML** autorizado y el **RIDE (PDF)** desde el mismo drawer.

Si SRI esta desactivado, el flujo de ventas sigue funcionando con nota de venta / ticket 80mm.

### Correo al cliente

Si la factura queda autorizada y el cliente tiene email, `InvoiceMailer` envia automaticamente el **XML autorizado** y el **RIDE PDF** adjuntos. Consumidor final o clientes sin email no reciben correo. En desarrollo, los correos se revisan en Letter Opener (`http://localhost:3001/letter_opener`).

### El RIDE (PDF)

El RIDE se genera dentro de la gema (`sri_facturacion/lib/sri_facturacion/ride.rb`) con Prawn: encabezado fiscal del emisor, caja de comprobante con numero y estado autorizado, datos del cliente, clave de acceso, QR, tabla de detalle y bloque de totales, con pie **StockManager by RysthDesign**.

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
