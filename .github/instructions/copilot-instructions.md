# Copilot Instructions — MicroBiz Platform

> Complete context for AI assistants working on this monorepo.
> Covers architecture, conventions, backend, frontend, and infrastructure.

---

## 1. Repository Layout

```
REACT-NESTJS-Stack/
├── admin/                    # React 19 admin SPA (Vite + Bun)
├── backend/                  # Rails 8 API (Rodauth + Sidekiq)
├── docker-compose.yml        # Production compose
├── docker-compose.dev.yml    # Development (+ Postgres, Redis, Sidekiq)
├── setup.sh                  # First-time project bootstrap
├── DEPLOYMENT.md             # Production deployment guide
└── .github/
    └── copilot-instructions.md   # ← You are here
```

---

## 2. Architecture Overview

| Layer           | Tech                                                       | Port (dev)         |
| --------------- | ---------------------------------------------------------- | ------------------ |
| **Frontend**    | React 19, TypeScript 5.7, Vite 6, TailwindCSS 4, Shadcn/ui | 5173               |
| **Backend**     | Rails 8.0 (API mode), Rodauth, ActiveRecord, Sidekiq       | 3000               |
| **Worker**      | Sidekiq (same Rails codebase, separate process)            | — (jobs only)      |
| **Database**    | PostgreSQL 16                                              | 5432               |
| **Cache/Queue** | Redis 7 (Sidekiq queues)                                   | 6379               |
| **Email (dev)** | Letter Opener Web (in-browser mail preview)                | 3000/letter_opener |

### Communication Flow

```
Browser ──► React SPA ──► Axios ──► Rails API ──► PostgreSQL
                                        │
                                        ├──► Redis (OTP cache, Sidekiq queues)
                                        └──► Sidekiq::Client.push(...)
                                                      │
                                               Sidekiq worker
                                                      │
                                             ActionMailer ──► SMTP
```

### Authentication Flow

1. `POST /api/v1/auth/send_otp` → validates email + password via Rodauth → queues OTP email via Sidekiq → returns short-lived `otp_token` (JWT)
2. `POST /api/v1/auth/verify_otp` → validates OTP from Redis → issues `access_token` (15 min) + `refresh_token` (7 days)
3. Frontend stores tokens in `localStorage`, attaches `Bearer` token on every request
4. Axios interceptor auto-refreshes expired access tokens

### Authorization (RBAC)

| Role         | Permissions                                    |
| ------------ | ---------------------------------------------- |
| **admin**    | All 9 permissions                              |
| **manager**  | All except `delete_users`                      |
| **operator** | `view_dashboard`, `view_users`, `edit_profile` |
| **user**     | `edit_profile` only                            |

**9 Permission Keys**: `view_dashboard`, `view_users`, `create_users`, `edit_users`, `delete_users`, `export_users`, `edit_profile`, `view_business`, `edit_business`

### Sidekiq Worker Architecture

```
Rails controllers/services          Redis              Sidekiq worker
┌──────────────────────┐     ┌──────────────┐     ┌───────────────────┐
│  SomeJob.perform_later│────►│  job queues  │◄────│  Job processors   │
│  (ActiveJob + Sidekiq)│     │              │     │  → ActionMailer   │
└──────────────────────┘     └──────────────┘     └───────────────────┘
```

- Jobs are ActiveJob classes backed by Sidekiq.
- Sidekiq retries failed jobs automatically with backoff.
- Adding new job types = new class in `app/jobs/`.

---

## 3. Global Conventions

### Language

- **Code**: always English (variable names, function names, comments, Git commits).
- **User-facing text**: always **Spanish** (labels, error messages, toasts, emails, validation messages).
- **API docs/Swagger**: Spanish descriptions are acceptable.

### API Design

| Rule                   | Convention                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Route prefix           | `api/v1/` for public routes, `api/internal/` for service-to-service                                                                  |
| HTTP verbs             | `GET` read, `POST` create / actions, `PUT` full update, `DELETE` remove                                                              |
| Request body nesting   | `{ user: {...}, roles: "admin,manager" }`, `{ profile: {...} }`                                                                      |
| Response serialization | **snake_case** keys (e.g., `created_at`, `phone_number`, `logo_url`)                                                                 |
| Error shape            | `{ status: 'error', message: string, errors?: string[], statusCode: number }`                                                        |
| Pagination             | Query: `page`, `per_page`, `search`, `role`. Response: `{ users, pagination: { total_count, total_pages, current_page, per_page } }` |
| Rate limiting          | Global default: 60 req/60s. Auth-sensitive routes: 5 req/60s via `@Throttle({ auth: ... })`                                          |
| File uploads           | `multipart/form-data`, max 2 MB, MIME types: `image/jpeg`, `image/png`, `image/webp`                                                 |

### Naming Conventions

| Context          | Convention             | Example                              |
| ---------------- | ---------------------- | ------------------------------------ |
| Models / Classes | PascalCase             | `AccountVerificationKey`             |
| Model files      | `snake_case.rb`        | `account_verification_key.rb`        |
| DB columns       | snake_case             | `password_hash`, `logo_path`         |
| DB tables        | plural snake_case      | `users`, `role_permissions`          |
| Controllers      | `<name>_controller.rb` | `users_controller.rb`                |
| Services         | `<name>_service.rb`    | `user_export_service.rb`             |
| Jobs             | `<name>_job.rb`        | `email_notification_job.rb`          |
| Mailers          | `<name>_mailer.rb`     | `otp_mailer.rb`                      |
| Concerns         | `<name>.rb`            | `authorizable.rb`                    |
| React pages      | PascalCase             | `AuthSignIn.tsx`, `UsersIndex.tsx`   |
| React components | PascalCase             | `SearchBar.tsx`, `PasswordInput.tsx` |
| Zustand stores   | `<name>Store.ts`       | `authStore.ts`, `userStore.ts`       |
| Hooks            | `use<Name>.ts`         | `useDocumentTitle.ts`                |

### Error Handling

- **Backend**: Controllers use `render_error` / `render_success` helpers (defined in `BaseController`). Use `authorize_permission!` from the `Authorizable` concern to enforce RBAC. Error messages in Spanish for user-facing scenarios. Raise `ActiveRecord::RecordNotFound` for missing resources (rescued globally).
- **Frontend**: Every store method wraps API calls in `try/catch`, sets `error` state with Spanish messages, and handles specific HTTP codes (401, 403, 404, 422, 429, 500). `429` always shows a rate-limit message.

### Caching (Redis)

- Redis is primarily used for Sidekiq job queues and OTP codes.
- OTP codes stored with a short TTL; invalidated on successful verification.

---

## 4. Git Practices

- Each feature or fix in its own branch.
- Commit messages: concise English, imperative mood (e.g., `Add rate limiting to auth routes`).
- Pull requests: describe the **what** and **why**, reference issues if applicable.

---

## 5. Development Quickstart

```bash
# 1. Clone & setup
git clone <repo>
cd REACT-NESTJS-Stack
cp backend/.env.example .env   # fill in env vars

# 2. Start dev stack (5 services)
docker compose -f docker-compose.dev.yml up -d

# 3. Database setup (first time)
docker exec -it base-api bundle exec rails db:prepare
docker exec -it base-api bundle exec rails db:seed

# 4. Access
# Frontend:         http://localhost:5173
# API:              http://localhost:3000/api/v1
# Letter Opener:    http://localhost:3000/letter_opener
# Sidekiq UI:       http://localhost:3000/sidekiq
# Redis CLI:        docker exec -it base-redis redis-cli
```

### Default Seed Users

| Email                  | Password      | Role     |
| ---------------------- | ------------- | -------- |
| `admin@example.com`    | `password123` | admin    |
| `manager@example.com`  | `password123` | manager  |
| `operator@example.com` | `password123` | operator |

---

## 6. Environment Variables

All env vars are documented in `.env.example` at the repo root. Critical ones:

| Variable                      | Purpose                       | Default (dev)                                            |
| ----------------------------- | ----------------------------- | -------------------------------------------------------- |
| `RAILS_ENV`                   | Environment flag              | `development`                                            |
| `SECRET_KEY_BASE`             | Rails secret key              | — (required)                                             |
| `PORT`                        | Server port                   | `3000`                                                   |
| `DATABASE_URL`                | PostgreSQL connection string  | `postgres://postgres:...@postgres/rails_api_development` |
| `REDIS_URL`                   | Redis connection string       | `redis://redis:6379/1`                                   |
| `FRONTEND_URL`                | CORS origin + email links     | `http://localhost:5173`                                  |
| `ALLOWED_ORIGINS`             | CORS origins (production)     | `http://localhost:5173`                                  |
| `VITE_API_URL`                | Frontend → Backend URL        | `http://localhost:3000`                                  |
| `SMTP_HOST` / `SMTP_PORT`     | Email server                  | `smtp.example.com` / `587`                               |
| `SMTP_USER` / `SMTP_PASSWORD` | SMTP credentials              | —                                                        |
| `CLOUDFLARE_*`                | R2 object storage credentials | —                                                        |
| `ADMIN_EMAIL`                 | Initial admin seed account    | `admin@example.com`                                      |
| `DOCKER_UID` / `DOCKER_GID`   | File permission matching      | `1000`                                                   |

---

## 7. Backend — Rails API

### Service Identity

| Property        | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| Framework       | Rails 8.0 (API mode)                                         |
| Language        | Ruby (`.ruby-version` in `backend/`)                         |
| ORM             | ActiveRecord + PostgreSQL 16                                 |
| Auth            | Rodauth (via `rodauth-rails`) + JWT (`jwt` gem)              |
| Background jobs | Sidekiq 7 + `sidekiq-scheduler` (cron)                       |
| Email           | ActionMailer (Letter Opener in dev, SMTP in prod)            |
| Rate limiting   | Rack::Attack                                                 |
| RBAC            | Custom `Permission` / `Role` models + `Authorizable` concern |
| File storage    | Cloudflare R2 via `aws-sdk-s3`                               |
| Pagination      | Pagy                                                         |
| Search          | Ransack                                                      |
| Export          | caxlsx (XLSX generation)                                     |
| API docs        | `rodauth-openapi` (development only)                         |
| Package manager | Bundler                                                      |

### Directory Structure

```
backend/
├── Dockerfile / Gemfile / Rakefile
├── app/
│   ├── controllers/
│   │   ├── application_controller.rb      # Base: Rodauth JWT auth, CORS
│   │   ├── rodauth_controller.rb          # Rodauth HTML controller
│   │   └── api/v1/
│   │       ├── base_controller.rb         # render_error / render_success helpers
│   │       ├── me_controller.rb           # GET /api/v1/me
│   │       ├── users_controller.rb        # api/v1/users (CRUD + export)
│   │       ├── businesses_controller.rb   # api/v1/businesses
│   │       ├── dashboard_controller.rb    # api/v1/dashboard/stats
│   │       ├── profile_controller.rb      # api/v1/profile
│   │       ├── permissions_controller.rb  # api/v1/permissions (read-only)
│   │       ├── auth/otp_controller.rb     # api/v1/auth/send_otp + verify_otp
│   │       └── public/businesses_controller.rb  # api/v1/public/business (unauthenticated)
│   ├── controllers/concerns/
│   │   └── authorizable.rb               # authorize_permission! helper
│   ├── models/                            # ActiveRecord models
│   │   ├── user.rb, role.rb, permission.rb, role_permission.rb
│   │   ├── business.rb, otp_code.rb
│   │   └── account.rb, account_verification_key.rb
│   ├── jobs/                              # ActiveJob + Sidekiq
│   │   ├── application_job.rb
│   │   ├── email_notification_job.rb
│   │   ├── otp_cleanup_job.rb
│   │   ├── user_export_job.rb
│   │   ├── data_cleanup_job.rb
│   │   └── business_processing_job.rb
│   ├── mailers/                           # ActionMailer
│   │   ├── otp_mailer.rb
│   │   ├── admin_mailer.rb
│   │   └── rodauth_mailer.rb
│   ├── misc/
│   │   ├── rodauth_app.rb                 # Rodauth middleware config
│   │   └── rodauth_main.rb                # Rodauth feature config
│   └── services/
│       ├── cloudflare_business_storage_service.rb
│       └── user_export_service.rb
├── config/
│   ├── routes.rb
│   ├── database.yml
│   └── initializers/  (rack_attack, sidekiq, cors, etc.)
└── db/
    ├── schema.rb
    ├── migrate/
    └── seeds/development.rb
```

### Route Prefixes

| Prefix              | Auth       | Guard                         | Purpose                     |
| ------------------- | ---------- | ----------------------------- | --------------------------- |
| `api/v1/<resource>` | Bearer JWT | `before_action :require_auth` | Authenticated user routes   |
| `api/v1/auth/*`     | None       | Rack::Attack (rate limit)     | Public auth endpoints       |
| `api/v1/public/*`   | None       | —                             | Public data (business info) |

### Controller Template

```ruby
module Api
  module V1
    class ResourcesController < BaseController
      before_action :require_authorization
      before_action -> { authorize_permission!(Permission::VIEW_RESOURCE) }

      def index
        resources = Resource.all  # + pagy / ransack
        render_success({ resources: resources })
      end

      def show
        resource = Resource.find(params[:id])
        render_success({ resource: resource })
      rescue ActiveRecord::RecordNotFound
        render_error("Recurso no encontrado", :not_found)
      end
    end
  end
end
```

### RBAC — Permission Checks

Use the `Authorizable` concern (included in `ApplicationController`):

```ruby
before_action -> { authorize_permission!(Permission::VIEW_USERS) }
before_action -> { authorize_any_permission!(Permission::EDIT_USERS, Permission::CREATE_USERS) }
```

The `Permission` model defines constants like `Permission::VIEW_USERS`, `Permission::EDIT_BUSINESS`, etc.

### Response Helpers (`BaseController`)

```ruby
render_success({ users: users, pagination: pagination_data })
render_error("Usuario no encontrado", :not_found)
render_error("Datos inválidos", :unprocessable_entity, ["email is blank"])
```

Response shape:

```json
{ "status": "success", "api_version": "v1", ...data }
{ "status": "error", "message": "...", "errors": [], "api_version": "v1" }
```

### Pagination (Pagy)

```ruby
pagy_instance, records = pagy(collection, items: params[:per_page] || 20)
render_success({
  users: records,
  pagination: {
    total_count: pagy_instance.count,
    total_pages: pagy_instance.pages,
    current_page: pagy_instance.page,
    per_page: pagy_instance.items
  }
})
```

### Background Jobs (Sidekiq + ActiveJob)

```ruby
# Enqueue a job
EmailNotificationJob.perform_later(user_id: user.id, type: "welcome")
OtpCleanupJob.perform_in(10.minutes)

# Job class
class EmailNotificationJob < ApplicationJob
  queue_as :default

  def perform(user_id:, type:)
    user = User.find(user_id)
    # ... send email via ActionMailer
  end
end
```

### Database Seeding

```bash
docker exec -it base-api bundle exec rails db:seed
```

### Common Backend Pitfalls

| Pitfall                                      | Rule                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| Missing `authorize_permission!`              | All data-modifying endpoints MUST check permissions                     |
| English error messages to users              | All user-facing messages MUST be in Spanish                             |
| Forgetting `render_error` / `render_success` | Always use `BaseController` helpers for consistent API response shape   |
| N+1 queries                                  | Use `includes()` / `eager_load()` — Bullet gem will warn in development |
| Synchronize/migrate in bad state             | Always run `db:migrate` before starting; use `db:prepare` on first boot |
| Hardcoding config                            | Use `Rails.application.config` or `ENV.fetch(...)` with defaults        |

---

## 8. Sidekiq Background Jobs

### Purpose

Sidekiq processes background jobs asynchronously, running as a separate `worker` Docker service from the same Rails codebase. Handles email sending, data cleanup, user exports, and scheduled tasks.

### Jobs

| Job                     | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `EmailNotificationJob`  | Generic email dispatch via ActionMailer |
| `OtpCleanupJob`         | Remove expired OTP codes                |
| `UserExportJob`         | Generate and email XLSX user exports    |
| `DataCleanupJob`        | Scheduled data housekeeping             |
| `BusinessProcessingJob` | Async business data operations          |

### How It Works

1. Any controller/service enqueues: `SomeJob.perform_later(...)`
2. Sidekiq picks it up from Redis and processes it
3. Sidekiq retries failed jobs with exponential backoff
4. Scheduled jobs are defined via `sidekiq-scheduler` config

### Adding a New Job

1. Create `app/jobs/<name>_job.rb` inheriting `ApplicationJob`
2. Set `queue_as :default` (or a named queue)
3. Implement `def perform(args)`
4. Enqueue with `NameJob.perform_later(args)`

### Sidekiq Web UI (development only)

Available at `http://localhost:3000/sidekiq` — shows queue stats, workers, retries.

---

## 9. Frontend — React SPA

### Tech Stack

| Library               | Version        | Purpose                                            |
| --------------------- | -------------- | -------------------------------------------------- |
| React                 | 19             | UI framework                                       |
| TypeScript            | 5.7            | Type safety (strict mode)                          |
| Vite                  | 6              | Build tool + dev server                            |
| Bun                   | latest         | Package manager (`bun install`, `bun run dev`)     |
| TailwindCSS           | 4              | Utility-first CSS (via `@tailwindcss/vite` plugin) |
| Shadcn/ui             | new-york style | Component library (Radix UI primitives)            |
| Zustand               | 5              | State management (with `persist` middleware)       |
| React Router          | 7              | Client-side routing (`createBrowserRouter`)        |
| React Hook Form       | 7              | Form handling + validation                         |
| Axios                 | latest         | HTTP client (with interceptors)                    |
| Recharts              | 3              | Charts (AreaChart, DonutChart, ComboChart)         |
| Lucide + Remixicon    | latest         | Icon sets                                          |
| react-hot-toast       | latest         | Toast notifications                                |
| @tanstack/react-table | latest         | Data tables                                        |

### Directory Structure

```
admin/src/
├── main.tsx                    # Entry point (StrictMode + RouterProvider)
├── index.css                   # TailwindCSS imports + CSS vars + theme
├── routes/index.tsx            # All routes (createBrowserRouter)
│
├── layouts/
│   ├── RootLayout.tsx          # Root: simple <Outlet />
│   ├── AuthLayout.tsx          # Auth: two-column (branding + form), dynamic business name/logo
│   └── DashboardLayout.tsx     # Dashboard: sidebar + breadcrumbs + content
│
├── pages/
│   ├── auth/                   # SignIn, SignUp, Confirm (OTP), VerifyEmail, ForgotPassword, ResetPassword
│   ├── dashboard/              # Dashboard, users/, business/, components/
│   ├── errors/                 # NotFound (auto-redirect after 3s)
│   └── root/                   # Home (landing page)
│
├── stores/                     # Zustand stores (auth, user, business, dashboard, profile)
├── components/
│   ├── ui/                     # Shadcn/ui components (DO NOT edit manually)
│   ├── common/                 # Pagination, SearchBar
│   ├── shared/                 # LogoutModal, PasswordInput
│   ├── navigation/             # AppSidebar
│   ├── routing/                # ProtectedRoute
│   ├── auth/                   # OtpInput
│   └── users/                  # UserFilters
│
├── hooks/                      # use-mobile, useDocumentTitle
├── types/auth.ts               # User, Permissions, PermissionKey types
├── utils/api.ts                # Axios instance + interceptors + token helpers
└── lib/                        # cn() utility, chart color helpers
```

### Routing

```
/auth/*          → AuthLayout (public)
/dashboard/*     → DashboardLayout (authenticated, permission-gated)
/identity/*      → AuthLayout (legacy URL compat)
*                → NotFound
```

### State Management (Zustand)

Every store: `isLoading`, `error`, `try/catch` on all API calls, Spanish error messages, 429 handling.

```typescript
fetchItems: async () => {
  set({ isLoading: true, error: null });
  try {
    const response = await api.get("/api/v1/resources");
    set({ items: response.data, isLoading: false });
  } catch (error: any) {
    let msg = "Error al obtener los recursos";
    if (error.response?.status === 429)
      msg = "Demasiadas solicitudes. Por favor, espera un momento.";
    set({ error: msg, isLoading: false });
  }
};
```

### API Layer (`utils/api.ts`)

- Base URL from `VITE_API_URL`
- Request interceptor: attaches `Authorization: Bearer <token>`
- Response interceptor: auto-refreshes 401s via `/api/v1/auth/token/refresh`

### Dynamic Business Branding

Business name/logo fetched from `GET /api/v1/public/business`. Always use:

```tsx
const { publicBusiness } = useBusinessStore();
const businessName = publicBusiness?.name || "MicroBiz";
```

Files using this: `AuthLayout.tsx`, `AppSidebar.tsx`, `NotFound.tsx`, `useDocumentTitle.ts`.

### UI Rules

- **Shadcn/ui** (new-york style): `npx shadcn@latest add <component>` — DO NOT edit `components/ui/` manually.
- **TailwindCSS** exclusively — no custom CSS files (except `index.css`).
- **Icons**: Lucide primary, Remixicon secondary.

### Frontend Error Handling

Every store method MUST handle these HTTP status codes:

| Status      | Spanish Message Pattern                                                                |
| ----------- | -------------------------------------------------------------------------------------- |
| 400         | Parse backend `error` or `message` field                                               |
| 401         | `"Sesión expirada. Por favor, inicia sesión nuevamente."`                              |
| 403         | `"No tienes permisos para realizar esta acción."`                                      |
| 404         | `"Recurso no encontrado."`                                                             |
| 422         | Parse backend validation errors                                                        |
| 429         | `"Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente."` |
| 500+        | `"Error del servidor. Intenta nuevamente en unos momentos."`                           |
| No response | `"Sin conexión. Verifica tu conexión a internet."`                                     |

### Common Frontend Pitfalls

| Pitfall                                 | Rule                                                       |
| --------------------------------------- | ---------------------------------------------------------- |
| Editing `components/ui/*` directly      | Use `npx shadcn@latest add` — manual edits get overwritten |
| Forgetting 429 in store error handling  | Every API call MUST handle rate-limit errors               |
| Hardcoding "MicroBiz" in new components | Always use `publicBusiness?.name` from `businessStore`     |
| English user-facing text                | All labels, messages, toasts MUST be in **Spanish**        |
| Missing `isLoading` state management    | Always set loading before/after API calls                  |
| Direct localStorage token access        | Use `api.ts` helpers: `saveToken()`, `clearToken()`        |
| Adding routes without protection        | Use `<ProtectedRoute>` with the correct permission         |

---

## 10. Infrastructure — Docker & DevOps

### Docker Compose (Development — 5 services)

```
┌────────────┐    ┌──────────────┐    ┌──────────┐
│ client     │───►│ server       │───►│ postgres │
│ :5173      │    │ :3000        │    │ :5432    │
└────────────┘    └──────┬───────┘    └──────────┘
                         │
                  ┌──────┴───────┐    ┌──────────┐
                  │   redis      │    │ sidekiq  │
                  │   :6379      │    │  worker  │
                  └──────────────┘    └──────────┘
```

Services:

- `admin` — React admin dev server (Vite HMR)
- `api` — Rails API (`rails s`) — also runs `db:prepare` on startup
- `postgres` — PostgreSQL 16 with healthcheck
- `redis` — Redis 7 with healthcheck
- `worker` — Sidekiq consumer (same image as `api`)

### Common Docker Operations

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Rebuild after Gemfile or Dockerfile changes (recreate bundle volume)
docker compose -f docker-compose.dev.yml up -d --build -V

# View logs
docker compose -f docker-compose.dev.yml logs -f api
docker compose -f docker-compose.dev.yml logs -f worker

# Execute commands in containers
docker exec -it base-api bundle exec rails db:seed
docker exec -it base-api bundle exec rails console
docker exec -it base-api bundle exec rails db:migrate
docker exec -it base-redis redis-cli
docker exec -it base-postgres psql -U postgres -d rails_api_development
```

### Volumes

| Volume                         | Type       | Purpose                                    |
| ------------------------------ | ---------- | ------------------------------------------ |
| `./admin:/app`                 | Bind mount | Admin source (HMR)                         |
| `./backend:/rails`             | Bind mount | Rails source (live reload)                 |
| `rails_bundle`                 | Named      | Bundler gems (shared between api + worker) |
| `postgres_data` / `redis_data` | Named      | Data persistence                           |

**Important**: When adding gems (`bundle add`), rebuild with `-V` to recreate the bundle volume:

```bash
docker compose -f docker-compose.dev.yml up -d --build -V
```

### Infrastructure Pitfalls

| Pitfall                                    | Rule                                                                |
| ------------------------------------------ | ------------------------------------------------------------------- |
| Baking secrets into Docker images          | Secrets go in environment variables, NEVER in Dockerfiles           |
| Missing `--build` after Dockerfile changes | Always pass `--build` when Dockerfile or Gemfile changes            |
| `VITE_API_URL` not set                     | Frontend env vars are baked at build time — must be in `build.args` |
| Stale bundle after `bundle add`            | Use `-V` flag to recreate the `rails_bundle` named volume           |
| Not recreating after `.env` changes        | Environment changes require `docker compose up -d`                  |
| `server.pid` left from crashed container   | Startup command runs `rm -f tmp/pids/server.pid` automatically      |

---

## 11. Testing

### Setup

- **Framework**: Minitest (Rails default) — test files in `backend/test/`
- **Location**: `test/` mirrors `app/` structure (`models/`, `controllers/`, `jobs/`, etc.)
- **Fixtures**: `test/fixtures/`

### Running Tests

```bash
docker exec -it base-api bundle exec rails test
docker exec -it base-api bundle exec rails test test/controllers/
docker exec -it base-api bundle exec rails test test/models/user_test.rb
```

### Test Pattern

```ruby
class UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:admin)
    # set JWT auth header
    @headers = { "Authorization" => "Bearer #{generate_token(@user)}" }
  end

  test "should list users" do
    get api_v1_users_url, headers: @headers
    assert_response :success
  end
end
```
