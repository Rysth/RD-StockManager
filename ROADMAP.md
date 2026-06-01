# RD-StockManager — Roadmap: Deploy clients/rysthdesign

> Deploy de producción para **RysthDesign** (jpalacios@novicompu.com) en servidor Dokploy.
> Estrategia: rama `clients/rysthdesign` derivada de `main`, con su propio proyecto en Dokploy.

---

## Estado actual (rama `main`)

- [x] Módulo completo de inventario, ventas, compras, gastos, reportes, facturación SRI
- [x] Módulo de Cotizaciones (Quotation) con plantilla A4 RysthDesign, conversión a venta
- [x] `Business.current` env-driven (`BUSINESS_*` vars, sin hardcode EDLU)
- [x] Permiso `MANAGE_QUOTATIONS` registrado y sembrado
- [x] Migración `20260601160000_create_quotations_and_items` aplicada en dev

---

## Fase 1 — Crear la rama `clients/rysthdesign`

**Objetivo:** tener la rama de producción lista para conectar a Dokploy.

- [ ] Commit de todos los cambios pendientes en `main` (quotations + env defaults)
- [ ] `git checkout -b clients/rysthdesign`
- [ ] `git push -u origin clients/rysthdesign`

---

## Fase 2 — Ajustes específicos de RysthDesign en la rama

**Objetivo:** personalizar la rama para el negocio sin tocar `main`.

### 2.1 — Seeds de producción
- [ ] Ajustar `backend/db/seeds.rb` o crear `backend/db/seeds/production.rb`:
  - Solo crear el usuario admin con email real (no datos demo de EDLU Store)
  - Permiso seed (`Permission.seed!`) incluido
  - Sin datos demo de zapatos/gorras (base limpia para uso real)
- [ ] Definir `ADMIN_EMAIL` y `ADMIN_PASSWORD` en env de Dokploy (no en código)

### 2.2 — Título del panel admin
- [ ] Cambiar `admin/index.html` title de `"EDLU Store | Powered By RysthDesign"` → `"RysthDesign | Panel de Gestión"`

### 2.3 — Terms & Conditions de cotización
- [ ] Revisar `admin/src/constants/terms.ts` — el texto ya dice "50% al inicio / 50% al finalizar"
  y es correcto para RysthDesign; confirmar o ajustar si cambia el modelo de cobro

---

## Fase 3 — Infraestructura Dokploy

**Objetivo:** tener el proyecto levantado en el servidor.

### 3.1 — Crear proyecto en Dokploy
- [ ] Servidor Dokploy → **New Project** → nombre: `RD-StockManager`
- [ ] Dentro del proyecto, crear **dos aplicaciones**:
  - `rysthdesign-api` → rama `clients/rysthdesign`, directorio `backend/`, Dockerfile existente
  - `rysthdesign-admin` → rama `clients/rysthdesign`, directorio `admin/`, Dockerfile o build estático

### 3.2 — Base de datos y servicios
- [ ] PostgreSQL (Dokploy managed o contenedor): crear DB `rdstock_rysthdesign_production`
- [ ] Redis: instancia compartida o dedicada
- [ ] Configurar `DATABASE_URL` y `REDIS_URL` en el env de la app API

### 3.3 — Variables de entorno para el API (Dokploy → Environment)

```env
# Rails
RAILS_ENV=production
SECRET_KEY_BASE=<rails secret>

# Base de datos
DATABASE_URL=postgres://user:pass@host:5432/rdstock_rysthdesign_production
REDIS_URL=redis://host:6379/1

# Orígenes
ADMIN_FRONTEND_URL=https://admin.rysthdesign.com
ADMIN_ALLOWED_ORIGINS=https://admin.rysthdesign.com

# SMTP
SMTP_HOST=smtp.rysthdesign.com
SMTP_PORT=587
SMTP_USER=support@rysthdesign.com
SMTP_PASSWORD=<password>
SMTP_DOMAIN=rysthdesign.com

# Identidad del negocio (siembra Business.current solo en primer arranque)
BUSINESS_NAME=RysthDesign
BUSINESS_SLOGAN=Diseño y desarrollo de software
BUSINESS_WHATSAPP=+593000000000
BUSINESS_EMAIL=support@rysthdesign.com
BUSINESS_LOCATION=Ecuador
BUSINESS_INSTAGRAM=
BUSINESS_FACEBOOK=
BUSINESS_TIKTOK=

# Admin inicial (seed de producción)
ADMIN_EMAIL=jpalacios@novicompu.com
# ADMIN_PASSWORD= (dejar vacío para auto-generar; se escribe en tmp/initial_admin.txt)

# Cloudflare R2 (imágenes) — opcional
CLOUDFLARE_ENDPOINT=
CLOUDFLARE_ACCESS_KEY_ID=
CLOUDFLARE_SECRET_ACCESS_KEY=
CLOUDFLARE_BUCKET_NAME=
```

### 3.4 — Variables de entorno para el admin (Vite build-time)
```env
VITE_API_URL=https://api.rysthdesign.com
```

---

## Fase 4 — Deploy y post-arranque

**Objetivo:** aplicación funcional en producción.

- [ ] **Build y deploy** del API desde Dokploy (detecta `Dockerfile` en `backend/`)
- [ ] **Verificar** que el entrypoint corre `db:prepare` (ya configurado en `docker-compose.dev.yml`; confirmar Dockerfile de producción)
- [ ] **Post-deploy** (una sola vez, desde Dokploy Console o SSH):
  ```bash
  bin/rails db:migrate
  bin/rails runner "Permission.seed!"
  ```
- [ ] Verificar que `Business` fue creado con datos de RysthDesign (`Business.first.name`)
- [ ] **Build y deploy** del frontend (admin)
- [ ] Verificar login en `https://admin.rysthdesign.com` con el admin inicial

---

## Fase 5 — Configuración post-login

**Objetivo:** dejar el negocio operativo desde el panel.

- [ ] Settings → Negocio: subir logo de RysthDesign, confirmar nombre/slogan/WhatsApp
- [ ] Settings → Negocio → SRI: configurar ambiente (pruebas primero), RUC, razón social, dirección matriz
- [ ] Subir certificado `.p12` desde el panel
- [ ] Crear al menos una ubicación (si se gestionará inventario físico) o dejar "Principal"
- [ ] Crear las categorías de servicios/productos de RysthDesign
- [ ] Invitar usuarios adicionales si los hay

---

## Fase 6 — Verificación end-to-end

- [ ] Crear una cotización → descargar PDF (debe mostrar logo y datos de RysthDesign)
- [ ] Cambiar estado a Aceptada → Convertir a venta
- [ ] Completar la venta
- [ ] (Opcional) Emitir factura SRI en ambiente de pruebas
- [ ] Crear un gasto y verificar que aparece en reportes

---

## Gestión de futuras actualizaciones

```
# Mejora nueva en main → traer a clients/rysthdesign
git checkout clients/rysthdesign
git merge main
git push origin clients/rysthdesign
# Dokploy detecta el push y redeploy automático (si está configurado webhook)
```

---

## Decisiones de diseño registradas

| Decisión | Razón |
|----------|-------|
| Estrategia branch-per-client | Un despliegue Dokploy por cliente; `main` es el tronco compartido |
| `Business` singleton env-driven | Cada rama configura su identidad sin editar código |
| Cotizaciones con líneas libres + variante opcional | RysthDesign vende servicios (libres) y a veces productos de inventario |
| PDF client-side (react-to-print) | Sin dependencia de PDF server-side; plantilla ya es RysthDesign-branded |
| No multi-tenancy | Cada cliente es un despliegue independiente; más simple y sin riesgo de contaminación de datos |
