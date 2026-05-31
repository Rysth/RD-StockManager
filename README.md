# StockManager by RysthDesign

Sistema full-stack para administrar inventario, ventas, compras, gastos, reportes y facturacion electronica SRI Ecuador. Incluye API Rails 8, panel administrativo React 19, worker Sidekiq, PostgreSQL y Redis.

## Caracteristicas

- POS con ventas completadas, pedidos contra entrega, reimpresion de ticket y control de stock.
- Inventario por productos, marcas, categorias, variantes, imagenes y stock por ubicacion.
- Compras a proveedores con recepcion de mercaderia, costos y saldos por pagar.
- Gastos operativos y nomina por empleado.
- Contactos enriquecidos: clientes, proveedores, saldos por cobrar/pagar y datos fiscales.
- Reportes de ventas, compras, impuestos, caja, gastos, contactos y representantes de venta.
- Facturacion electronica SRI en ambiente pruebas/produccion con XML autorizado y RIDE PDF.
- Envio opcional de factura por email al cliente con XML y RIDE adjuntos.
- Roles de negocio: admin, dueno del negocio y empleado restringido por sucursal.
- Auditoria de cambios con trazabilidad por usuario.

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

Variables principales en `.env`:

```env
SRI_AMBIENTE=1
SRI_CERT_PATH=/rails/storage/sri_certs/certificado.p12
SRI_CERT_PASSWORD=tu_clave_local
SRI_MAX_RETRIES=3
SRI_RETRY_DELAY=2
```

El certificado `.p12` debe vivir localmente en:

```txt
backend/storage/sri_certs/certificado.p12
```

No subas certificados ni claves al repositorio. Los archivos `.p12` y `.pfx` estan ignorados por git.

Para emitir una factura:

1. Configura los datos legales en `Configuracion > Negocio > Facturacion SRI`.
2. Registra una venta completada desde el POS.
3. Abre la venta en `Ventas`.
4. Desde el drawer de detalle, confirma `Emitir factura SRI`.
5. Descarga XML/RIDE cuando quede autorizada.

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
