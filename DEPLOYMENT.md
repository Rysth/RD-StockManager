# Deployment Guide — Dokploy + Docker Compose

Guía real de despliegue de RD-StockManager en un servidor **Dokploy**, usando
`docker-compose.prod.yml`. Cada cliente es un **despliegue independiente** (sin
multi-tenancy): una rama `clients/<nombre>` derivada de `main` y su propio
proyecto en Dokploy.

> **Estrategia branch-per-client:** `main` es el tronco compartido y trae un
> `docker-compose.prod.yml` **genérico** (dominios vía variables de entorno).
> Cada rama de cliente puede dejar ese archivo genérico y configurar todo desde
> el Environment de Dokploy, o hardcodear sus dominios en su propia copia.

---

## 1. Arquitectura del stack

`docker-compose.prod.yml` levanta **5 contenedores** autocontenidos:

| Servicio | Imagen / build | Rol |
|----------|----------------|-----|
| `postgres` | `postgres:16-alpine` | Base de datos (volumen `postgres_data`) |
| `redis`    | `redis:7-alpine`     | Cache de Rails + cola de Sidekiq (volumen `redis_data`) |
| `api`      | `./backend`          | API Rails (puerto 3000, tras Traefik) |
| `admin`    | `./admin`            | Panel React servido por Nginx (puerto 5173) |
| `worker`   | `./backend`          | Sidekiq (jobs en segundo plano) |

- **Postgres y Redis viven dentro del stack** con volúmenes persistentes → el
  deploy no depende de servicios externos.
- `DATABASE_URL` y `REDIS_URL` apuntan por defecto a los contenedores internos
  (`postgres`/`redis`). Si defines esas variables en Dokploy, **sobrescriben**
  el default y puedes usar una DB/Redis externos.
- `api` y `worker` **esperan** a que Postgres y Redis estén `healthy`
  (`depends_on: condition: service_healthy`) antes de arrancar.
- Al iniciar, `api` corre automáticamente:
  `db:prepare` (crea + migra) → `db:seed` (admin) → `rails server`.

---

## 2. Preparar la rama del cliente

```bash
git checkout -b clients/<nombre>
git push -u origin clients/<nombre>
```

Personalizaciones opcionales por cliente (solo en su rama, no en `main`):
- `admin/index.html` → `<title>` del panel.
- `admin/src/constants/terms.ts` → términos y condiciones de cotización.
- Hardcodear dominios en `docker-compose.prod.yml` (alternativa a usar variables).

---

## 3. Crear el proyecto en Dokploy

1. **New Project** → conecta el repo GitHub (`RD-StockManager`).
2. Tipo: **Docker Compose**.
3. En **Provider**:
   - **Branch:** `clients/<nombre>`
   - **Compose Path:** `./docker-compose.prod.yml`
   - **Trigger Type:** `On Push` + **Autodeploy** ON (redeploy automático al
     hacer `git push` a la rama).

No necesitas crear servicios de Postgres/Redis aparte: ya vienen en el compose.

---

## 4. Variables de entorno (Dokploy → Environment)

Pega esto y rellena los `<...>`. Con la plantilla **genérica** de `main`, los
dominios se controlan con `APP_DOMAIN` / `API_DOMAIN` / `VITE_API_URL`.

```env
# Dominios (la plantilla genérica los usa en Traefik, CORS y build del admin)
APP_DOMAIN=<panel.tudominio.com>
API_DOMAIN=<api.tudominio.com>
VITE_API_URL=https://<api.tudominio.com>

# Postgres interno (se aplica SOLO al inicializar el volumen vacío la 1ª vez)
POSTGRES_USER=<usuario>
POSTGRES_PASSWORD=<contraseña_fuerte>
POSTGRES_DB=<nombre_db>

# Rails (genera con: openssl rand -hex 64)
SECRET_KEY_BASE=<64_hex>

# Admin inicial (lo crea db:seed en el primer arranque)
ADMIN_EMAIL=<tu-email>
ADMIN_PASSWORD=<contraseña>        # si lo dejas vacío, se auto-genera en tmp/initial_admin.txt

# Identidad del negocio (siembra Business.current; luego se edita desde el panel)
BUSINESS_NAME=<Nombre>
BUSINESS_SLOGAN=<Slogan>
BUSINESS_WHATSAPP=<+593...>
BUSINESS_EMAIL=<correo>
BUSINESS_LOCATION=<Ecuador>
BUSINESS_INSTAGRAM=
BUSINESS_FACEBOOK=
BUSINESS_TIKTOK=

# SMTP (para emails: reset de contraseña, etc.)
SMTP_HOST=<smtp.proveedor.com>
SMTP_PORT=587
SMTP_USER=<usuario_smtp>
SMTP_PASSWORD=<password_smtp>
SMTP_DOMAIN=<tudominio.com>

# Cloudflare R2 (almacenamiento de imágenes)
CLOUDFLARE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
CLOUDFLARE_ACCESS_KEY_ID=<access_key>
CLOUDFLARE_SECRET_ACCESS_KEY=<secret_key>
CLOUDFLARE_BUCKET_NAME=<bucket>
```

> **Si tu rama hardcodea los dominios** en `docker-compose.prod.yml` (como hace
> `clients/rysthdesign`), **omite** `APP_DOMAIN`, `API_DOMAIN`, `VITE_API_URL`
> y `ADMIN_FRONTEND_URL`/`ADMIN_ALLOWED_ORIGINS`/`HOSTS_WHITELIST`: ya van
> dentro del archivo.

### ⚠️ Reglas de oro de las variables

- **No pongas `DATABASE_URL` ni `REDIS_URL`** si usas los contenedores internos.
  Solo defínelas para apuntar a una DB/Redis externos.
- **No dejes placeholders** como `<ACCOUNT_ID>` sin reemplazar → Rails revienta
  al arrancar.

---

## 5. Configurar dominios en Dokploy

En la pestaña **Domains** del proyecto, agrega los hosts y deja que Traefik
emita los certificados Let's Encrypt:
- `APP_DOMAIN` → servicio `admin`, puerto `5173`
- `API_DOMAIN` → servicio `api`, puerto `3000`

Asegúrate de que el DNS de esos subdominios apunte a la IP del servidor Dokploy.

---

## 6. Deploy

Pulsa **Deploy**. La primera vez, el arranque del `api`:
1. Espera a Postgres y Redis `healthy`.
2. `db:prepare` → crea la DB y aplica migraciones.
3. `db:seed` → ejecuta `backend/db/seeds/production.rb` (roles, permisos,
   ubicación "Principal" y el usuario admin desde `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
4. Levanta el servidor Rails.

En los logs de `rdstock-api` debes ver:

```
✅ Admin user created!
   Email: <tu-email>
```

Luego entra a `https://<APP_DOMAIN>` y haz login con el admin inicial.

---

## 7. Configuración post-login

- **Settings → Negocio:** sube el logo, confirma nombre/slogan/WhatsApp.
- **Settings → Negocio → SRI:** ambiente (pruebas primero), RUC, razón social,
  dirección matriz, y sube el certificado `.p12`.
- Crea categorías/productos o servicios según el negocio.
- Invita usuarios adicionales si aplica.

---

## 8. Actualizaciones futuras

```bash
# Traer mejoras de main a la rama del cliente
git checkout clients/<nombre>
git merge main
git push origin clients/<nombre>     # Autodeploy redeploya solo
```

> **Conflicto esperado en `docker-compose.prod.yml`** si tu rama lo tiene
> hardcodeado (main lo trae genérico). Resuélvelo conservando tu versión:
> ```bash
> git checkout --ours docker-compose.prod.yml
> git add docker-compose.prod.yml
> git commit
> ```
> Los archivos de Rails (`config/environments/*`, `initializers/frontend_urls.rb`,
> `db/seeds/production.rb`) fusionan limpio porque son idénticos en ambas ramas.

---

## 🔍 Troubleshooting

| Síntoma | Causa / solución |
|---------|------------------|
| `NameError: uninitialized constant FrontendUrls` | Ya resuelto en `main`: `production.rb` requiere el initializer antes de usarlo. Si reaparece, confirma que tu rama tiene el fix mergeado. |
| `PG::ConnectionBad: password authentication failed` | Cambiaste `POSTGRES_USER/PASSWORD` **después** de crear el volumen. Postgres solo lee esas vars al inicializar un volumen vacío. Borra el volumen y redeploy: `docker compose -p <proyecto> down -v` |
| Sitio carga en `example.com` y no en tu dominio | Faltan `APP_DOMAIN`/`API_DOMAIN`/`VITE_API_URL` en el Environment (plantilla genérica usa defaults `example.com`). |
| `502 Bad Gateway` | El `api` aún no arranca (revisa sus logs) o el puerto de Traefik no coincide (`api`→3000, `admin`→5173). |
| Rails no arranca y menciona R2/Cloudflare | Hay un placeholder `<ACCOUNT_ID>` sin reemplazar en `CLOUDFLARE_ENDPOINT`. |

### Comandos útiles (terminal del servidor Dokploy)

```bash
# Nombre del proyecto: ver carpeta en /etc/dokploy/compose/<proyecto>/code

# Logs
docker logs rdstock-api -f
docker logs rdstock-worker -f

# Reset total (¡borra datos! solo si la DB está vacía)
docker compose -p <proyecto> down -v

# Consola de Rails en producción
docker exec -it rdstock-api bash -lc "cd /rails && bundle exec rails console"

# Re-correr seeds / migraciones manualmente
docker exec -it rdstock-api bash -lc "cd /rails && bundle exec rails db:migrate"
docker exec -it rdstock-api bash -lc "cd /rails && bundle exec rails db:seed"
```

---

**Mantenido por:** [RysthDesign](https://rysthdesign.com/)
