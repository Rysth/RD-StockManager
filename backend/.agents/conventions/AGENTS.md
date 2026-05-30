# Backend — Agent Conventions

Reference guide for any agent making changes to this Rails API. Read this before touching any file.

---

## Overview

| Item | Value |
|------|-------|
| Framework | Rails 8 (API-only) |
| Language | Ruby 3.x |
| Database | PostgreSQL (with `citext` extension) |
| Auth | Rodauth (OTP + JWT bearer tokens) |
| Cache | Redis via `Rails.cache` |
| Background Jobs | Sidekiq |
| Search/Filter | Ransack |
| Pagination | Pagy |
| File Storage | Active Storage + Cloudflare R2 |
| Base URL | `/api/v1/` |
| Error messages | Spanish |

---

## Project Structure

```
backend/
├── app/
│   ├── controllers/
│   │   ├── application_controller.rb       # Sets up Rodauth helpers
│   │   └── api/v1/
│   │       ├── base_controller.rb          # render_success / render_error helpers
│   │       ├── users_controller.rb
│   │       ├── businesses_controller.rb
│   │       ├── permissions_controller.rb
│   │       ├── profile_controller.rb
│   │       ├── dashboard_controller.rb
│   │       └── me_controller.rb
│   ├── models/
│   │   ├── user.rb                         # rolify, delegates to account
│   │   ├── account.rb                      # Rodauth account (email + password_hash)
│   │   ├── business.rb                     # singleton via Business.current
│   │   ├── permission.rb                   # constants + seed! method
│   │   ├── role.rb
│   │   └── role_permission.rb
│   ├── services/
│   │   ├── user_export_service.rb          # XLSX export
│   │   └── cloudflare_business_storage_service.rb
│   ├── jobs/                               # Sidekiq jobs
│   └── mailers/
├── config/
│   └── routes.rb                           # All routes declared here
└── db/
    └── schema.rb
```

---

## Core Conventions

### 1. Controller Namespace

Every controller lives under `Api::V1` and inherits `BaseController`:

```ruby
module Api
  module V1
    class ThingsController < BaseController
      # ...
    end
  end
end
```

### 2. Response Helpers (from BaseController)

Always use these helpers instead of raw `render json:`:

```ruby
# Success
render_success({ things: @things })
render_success({ thing: @thing }, 'Cosa creada correctamente')

# Error
render_error('No encontrado', :not_found)
render_error('Datos inválidos', :unprocessable_entity, @thing.errors.full_messages)
```

The shape is always:
```json
{ "status": "success"|"error", "api_version": "v1", ...data }
```

### 3. Authentication

Apply to every action unless it is a public endpoint:

```ruby
before_action :authenticate_rodauth_user!
```

The current user is accessed via `current_rodauth_user` (returns a `User` instance).

### 4. Permissions

Use constants from `Permission` model. Always match the verb to the action:

```ruby
before_action -> { authorize_permission!(Permission::VIEW_THINGS) },   only: [:index, :show]
before_action -> { authorize_permission!(Permission::CREATE_THINGS) }, only: [:create]
before_action -> { authorize_permission!(Permission::EDIT_THINGS) },   only: [:update]
before_action -> { authorize_permission!(Permission::DELETE_THINGS) }, only: [:destroy]
before_action -> { authorize_permission!(Permission::EXPORT_THINGS) }, only: [:export]
```

Existing permission groups: `dashboard`, `users`, `business`, `profile`.

### 5. Cache Pattern

**Read** — wrap in `Rails.cache.fetch`:
```ruby
cache_key = "things:index:#{params[:page]}:#{params[:search]}"
data = Rails.cache.fetch(cache_key, expires_in: 5.minutes) do
  # expensive query
end
```

**Write / Delete** — invalidate after every mutation:
```ruby
Rails.cache.delete_matched("things:index*")
Rails.cache.delete("thing:#{@thing.id}:*")
```

Cache key conventions:
- Collection: `"<resource>:index:<params>"`
- Single record: `"<resource>:<id>:<updated_at.to_i>"`
- Dashboard (per user): `"dashboard:stats:#{current_rodauth_user.id}"`
- Business: `"business:current"`, `"public:business:current"`

### 6. Model Conventions

```ruby
class Thing < ApplicationRecord
  # Associations first
  belongs_to :user

  # Validations — messages in Spanish
  validates :name, presence: { message: "El nombre es requerido" }
  validates :name, uniqueness: { message: "Este nombre ya está en uso" }

  # Ransack allowlist (required for search to work)
  def self.ransackable_attributes(_auth_object = nil)
    %w[id name created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[user]
  end
end
```

### 7. Search & Pagination

```ruby
base_query = Thing.includes(:user)
@q = base_query.ransack(search_params)
@q.sorts = 'id desc' if @q.sorts.empty?
@pagy, @things = pagy(@q.result(distinct: true), page: params[:page] || 1, limit: params[:per_page] || 12)
```

Pagination response shape:
```ruby
{
  current_page: @pagy.page,
  total_pages: @pagy.pages,
  total_count: @pagy.count,
  per_page: @pagy.limit
}
```

### 8. Strong Parameters

Use a private `thing_params` method. Never permit `:id`, `:created_at`, or `:updated_at`.

### 9. Routes

All resources live inside `namespace :api > namespace :v1`:

```ruby
resources :things do
  collection do
    get :export           # GET  /api/v1/things/export
  end
  member do
    put :toggle_active    # PUT  /api/v1/things/:id/toggle_active
  end
end
```

---

## Adding a New Resource

Follow these steps in order:

### Step 1 — Define permissions

In `app/models/permission.rb`, add constants and register them in `ALL_KEYS` and `ROLE_DEFAULTS`:

```ruby
# New resource
VIEW_THINGS   = "view_things".freeze
CREATE_THINGS = "create_things".freeze
EDIT_THINGS   = "edit_things".freeze
DELETE_THINGS = "delete_things".freeze

ALL_KEYS = [
  ...,
  VIEW_THINGS, CREATE_THINGS, EDIT_THINGS, DELETE_THINGS
].freeze

ROLE_DEFAULTS = {
  "admin"   => ALL_KEYS,
  "manager" => [..., VIEW_THINGS, CREATE_THINGS, EDIT_THINGS, DELETE_THINGS],
  # ...
}
```

Then add seed definitions inside `Permission.seed!`:
```ruby
{ key: VIEW_THINGS, name: "Ver Cosas", group: "things", description: "Ver lista de cosas" },
```

Re-run seeds after: `bin/rails db:seed`

### Step 2 — Create migration

```bash
bin/rails generate migration CreateThings name:string user:references
bin/rails db:migrate
```

### Step 3 — Create model

`app/models/thing.rb` — include validations (Spanish), callbacks, `ransackable_attributes`, and `ransackable_associations`.

### Step 4 — Create controller

`app/controllers/api/v1/things_controller.rb`:
- Inherit `BaseController`
- Apply `authenticate_rodauth_user!`
- Apply `authorize_permission!` per action
- Use `Rails.cache.fetch` for `index`/`show`
- Call `Rails.cache.delete_matched("things:index*")` on every write
- Use `render_success` / `render_error` exclusively
- Keep private methods: `set_thing`, `thing_params`, `search_params`

### Step 5 — Register routes

Add `resources :things` (with any `member`/`collection` blocks) inside `namespace :api > namespace :v1` in `config/routes.rb`.

### Step 6 — (Optional) Service object

For complex logic (exports, third-party calls), create `app/services/thing_<verb>_service.rb` and call it from the controller. Keep controllers thin.

---

## Updating an Existing Resource

Typical files touched:

| Change | Files |
|--------|-------|
| Add/remove field | Migration → Model → Controller (`strong params` + serialization) |
| Add a new action | Controller (new method) → Routes (`member` or `collection`) → Permissions (if new perm needed) |
| Change search filters | `search_params` in controller → `ransackable_attributes` in model |
| Change cache TTL or key | Only the controller |
| Add background job | `app/jobs/` → call `Job.perform_later(...)` from controller or model callback |

---

## Validation Checklist

Before finishing any change, verify:

- [ ] All new validations have Spanish error messages
- [ ] New actions are guarded by `authenticate_rodauth_user!` and `authorize_permission!`
- [ ] Cache is invalidated on every write action (`delete_matched` for collections, `delete` for records)
- [ ] `ransackable_attributes` / `ransackable_associations` updated if new searchable fields added
- [ ] New permissions added to `Permission::ALL_KEYS`, `ROLE_DEFAULTS`, and `Permission.seed!`
- [ ] Routes added in the correct namespace (`api/v1`)
- [ ] Response uses `render_success` / `render_error` — no raw `render json:` with custom shapes
- [ ] Strong params do not expose `:id`, `:created_at`, `:updated_at`
- [ ] `bin/rails db:migrate` run after any schema change
