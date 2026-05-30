# REACT-RAILS Stack

Un template full-stack con React para el panel administrativo, Astro para el storefront y Rails para la API/backend en un solo repositorio.

## 🚀 Inicio Rápido

### Requisitos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose
- Git

### Configuración Automática

1. **Clona el repositorio (con submodules):**

```bash
git clone --recurse-submodules https://github.com/Rysth/REACT-RAILS-Stack.git
cd REACT-RAILS-Stack
```

> Si ya clonaste sin `--recurse-submodules`, inicializa los submodules manualmente:
>
> ```bash
> git submodule update --init --recursive
> ```

2. **Ejecuta el script de configuración:**

```bash
chmod +x setup.sh
./setup.sh
```

El script automáticamente:

- Crea `.env` desde `.env.example` si no existe
- Levanta los contenedores principales. `storefront` queda opcional por defecto.

3. **Accede a las aplicaciones:**

- Admin panel (React): http://localhost:5173
- Storefront opcional (Astro): http://localhost:4321
- API (Rails): http://localhost:3000
- Letter Opener: http://localhost:3000/letter_opener

## 📁 Estructura del Proyecto

```
REACT-RAILS-Stack/
├── admin/                  # Panel administrativo React + TypeScript + Vite
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── storefront/             # Landing pública Astro + Tailwind + daisyUI
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── mobile/                 # App mobile Expo + React Native + NativeWind
│   ├── App.tsx
│   ├── app.json
│   └── package.json
├── backend/                # Rails API + Sidekiq
├── docker-compose.yml      # Producción
├── docker-compose.dev.yml  # Desarrollo
├── .gitmodules             # Configuración de submodules
├── .env.example            # Variables de entorno
├── setup.sh                # Script de configuración
├── DEPLOYMENT.md           # Guía de despliegue
└── README.md
```

## 🔗 Git Submodules

El servicio de autenticación (`services/ms-auth`) es un **git submodule** independiente que puede compartirse entre múltiples proyectos.

| Submodule    | Repositorio                                                                   | Ruta               |
| ------------ | ----------------------------------------------------------------------------- | ------------------ |
| Auth Service | [nestjs-microservice-auth](https://github.com/Rysth/nestjs-microservice-auth) | `services/ms-auth` |

### Comandos útiles para submodules

```bash
# Actualizar submodules al último commit
git submodule update --remote --merge

# Clonar repo con submodules incluidos
git clone --recurse-submodules <repo-url>

# Inicializar submodules después de clonar
git submodule update --init --recursive
```

## 🔧 Comandos Útiles

### Desarrollo

```bash
# Levantar todos los servicios
./setup.sh

# Levantar servicios manualmente
docker compose -f docker-compose.dev.yml up

# Levantar también el storefront opcional
docker compose -f docker-compose.dev.yml --profile storefront up

# Levantar solo el storefront cuando ya está corriendo el stack base
docker compose -f docker-compose.dev.yml --profile storefront up storefront

# Detener servicios
docker compose -f docker-compose.dev.yml down

# Ver logs
docker compose -f docker-compose.dev.yml logs -f

# Reconstruir contenedores
docker compose -f docker-compose.dev.yml up --build
```

### Base de Datos

```bash
# Ejecutar migraciones (NestJS con TypeORM — automáticas con synchronize en dev)
# En producción, usa migraciones explícitas de TypeORM

# Ejecutar seed de datos
docker exec -it base-auth-api npx ts-node src/database/seeds/seed.ts

```

### Administración

```bash
# Reiniciar contenedor Auth
docker restart base-auth-api

# Ver logs del contenedor Auth
docker logs base-auth-api -f

# Acceder al contenedor Auth
docker exec -it base-auth-api sh
```

## ⚙️ Configuración

### Variables de Entorno

Copia `.env.example` a `.env` y ajusta las variables según tu entorno:

```bash
cp .env.example .env
```

### Configuraciones Importantes

- `VITE_API_URL` — URL de la API para el panel administrativo
- `PUBLIC_API_URL` — URL de la API para el storefront Astro
- `ADMIN_FRONTEND_URL`, `STOREFRONT_FRONTEND_URL` — URLs base de cada frontend
- `ADMIN_ALLOWED_ORIGINS`, `STOREFRONT_ALLOWED_ORIGINS` — CORS por frontend
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — PostgreSQL
- `REDIS_URL` — Configuración de Redis
- `JWT_SECRET` — Secreto para tokens JWT
- `SERVICE_KEY` — Clave para comunicación entre microservicios

## 🐳 Servicios Docker

| Servicio   | Puerto | Descripción                |
| ---------- | ------ | -------------------------- |
| admin      | 5173   | Panel administrativo React |
| storefront | 4321   | Landing pública Astro opcional (`--profile storefront`) |
| api        | 3000   | API Rails                  |
| postgres   | 5432   | Base de datos PostgreSQL   |
| redis      | 6379   | Cache y colas internas     |

## 🔍 Desarrollo Local (sin Docker)

### Admin Panel (React)

```bash
cd admin
npm install
npm run dev
```

### Storefront (Astro)

```bash
cd storefront
npm install
npm run dev
```

### Mobile (Expo + React Native + NativeWind)

```bash
cd mobile
npm install
npm run start:tunnel
```

En WSL/Ubuntu se recomienda `start:tunnel` porque la red LAN puede no resolver bien desde Expo Go en el teléfono. Escanea el QR con Expo Go para abrir la app.

### Auth Service (NestJS)

```bash
cd services/ms-auth
npm install
npm run start:dev
```

## 🌿 Branches

| Branch          | Descripción                              |
| --------------- | ---------------------------------------- |
| `main`          | Stack actual con NestJS (microservicios) |
| `rails-backend` | Stack anterior con Ruby on Rails         |

## 📝 Notas

- **Arquitectura de microservicios**: Cada servicio es independiente y se comunica vía HTTP/REST
- **Submodules**: El servicio de auth es un repositorio independiente compartible entre proyectos
- **Hot reloading**: Todos los servicios soportan recarga automática durante el desarrollo
- **Persistencia**: Los datos de PostgreSQL y Redis se mantienen en volúmenes Docker

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -m 'Añadir nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

> **Nota:** Si modificas el submodule `services/ms-auth`, haz PR en el [repositorio del auth service](https://github.com/Rysth/nestjs-microservice-auth) directamente.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

Creado por [RysthDesign](https://rysthdesign.com/)
