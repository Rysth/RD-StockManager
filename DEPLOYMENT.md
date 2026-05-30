# Deployment Guide - Multi-Company Setup

This guide explains how to deploy the same codebase for different companies (e.g., current setup for "currentcompany.com" and new deployment for "newcompany.com").

## 🚀 6-Step Deployment Process

### Step 1: Update Docker Network Name

**File:** `docker-compose.yml`

Change the network name to avoid conflicts:

```yaml
networks:
  newcompany_network: # Change from currentcompany_network
    driver: bridge
```

And update all service network references:

```yaml
services:
  admin:
    networks:
      - newcompany_network # Update this
  api:
    networks:
      - newcompany_network # Update this
  # ... repeat for all services
```

### Step 2: Update Domain Names in Docker Compose

**File:** `docker-compose.yml`

Update Traefik labels with new domains:

```yaml
services:
  admin:
    labels:
      - "traefik.http.routers.admin.rule=Host(`admin.newcompany.com`)" # New admin domain
  api:
    labels:
      - "traefik.http.routers.api.rule=Host(`api.newcompany.com`)" # New API domain
```

### Step 3: Update Nginx Configuration

**File:** `admin/nginx.conf`

Change the upstream server, server_name, and Host header (3 places):

````nginx
# Upstream for Rails API using external domain
upstream rails_backend {
    # usa el dominio público con TLS
    server api.newcompany.com:443;  # New API domain
}

server {
    listen 5173;
    server_name admin.newcompany.com;  # New admin domain
    root /usr/share/nginx/html;
    index index.html;

    resolver 1.1.1.1 8.8.8.8 valid=30s;   # ✅ usa DNS público, no 127.0.0.11

      storefront:
        labels:
          - "traefik.http.routers.storefront.rule=Host(`www.newcompany.com`)" # New storefront domain
    location ~ ^/(api/|me|up|login|logout|create-account|verify-account|reset-password|reset-password-request|change-password|change-login|verify-login-change|close-account|verify-account-resend) {
        proxy_pass https://rails_backend;
        proxy_set_header Host api.newcompany.com;  # New API domain
        proxy_set_header X-Real-IP $remote_addr;
    ### Step 3: Update Runtime Proxy Variables
        proxy_set_header X-Forwarded-Proto https;
    **Files:** `docker-compose.yml`, `.env`
        proxy_ssl_server_name on;
    The admin image now renders its Nginx config from environment variables at container startup. Update these values instead of editing the file directly:

    ```env
    ADMIN_SERVER_NAME=admin.newcompany.com
    API_UPSTREAM_SCHEME=https
    API_UPSTREAM_HOST=api.newcompany.com
    API_UPSTREAM_PORT=443
    ```

Set up environment variables for the new company:

```env
# Admin
ADMIN_FRONTEND_URL=https://admin.newcompany.com
ADMIN_ALLOWED_ORIGINS=https://admin.newcompany.com
VITE_API_URL=https://api.newcompany.com

# Storefront
STOREFRONT_FRONTEND_URL=https://www.newcompany.com
STOREFRONT_ALLOWED_ORIGINS=https://www.newcompany.com
PUBLIC_API_URL=https://api.newcompany.com

# Database (new database for new company)
DB_HOST=postgres
DB_NAME=newcompany_db
DB_USER=newcompany_user
DB_PASSWORD=your_secure_password

# Other variables...
````

### Step 6: Deploy and Create Admin

```bash
# Build and deploy
docker-compose build
docker-compose up -d

# Create admin account (update the seed/admin bootstrap with new company details)
docker exec -it rails-api ruby /rails/create_admin.rb
```

## 🔄 Database Migrations

### Automatic Migration Execution

**Yes!** Migrations run automatically on server start because of this line in `docker-compose.yml`:

```yaml
command: bash -c "rm -f tmp/pids/server.pid && bundle exec rails db:migrate && bundle exec rails s -p ${PORT} -b '0.0.0.0'"
```

### Migration Process

1. **Add new migration:** `rails generate migration AddNewFeature`
2. **Commit changes:** Push to your repository
3. **Deploy:** Run `docker-compose up -d api`
4. **Automatic execution:** Server restarts and runs `rails db:migrate` automatically

### Manual Migration (if needed)

```bash
# Run specific migration
docker exec -it rails-api bundle exec rails db:migrate

# Rollback migration
docker exec -it rails-api bundle exec rails db:rollback

# Check migration status
docker exec -it rails-api bundle exec rails db:migrate:status
```

## 📋 Quick Checklist for New Deployment

- [ ] Change network name in `docker-compose.yml`
- [ ] Update admin domain in Traefik labels
- [ ] Update storefront domain in Traefik labels
- [ ] Update API domain in Traefik labels
- [ ] Update `ADMIN_SERVER_NAME`, `API_UPSTREAM_SCHEME`, `API_UPSTREAM_HOST`, and `API_UPSTREAM_PORT`
- [ ] Update allowed hosts in `admin/vite.config.ts`
- [ ] Create new `.env` file with company-specific variables
- [ ] Update `create_admin.rb` with new admin credentials
- [ ] Build and deploy: `docker-compose up -d`
- [ ] Create admin account
- [ ] Test login and functionality

## 🔍 Troubleshooting

### Common Issues

1. **502 Bad Gateway:** Check nginx upstream domain matches Traefik labels
2. **SSL Errors:** Ensure using port 443 in nginx upstream
3. **Migration Errors:** Check database connection and permissions
4. **Network Issues:** Verify all services use the same network name

### Debug Commands

```bash
# Check running containers
docker ps

# View logs
docker logs rails-api -f
docker logs react-client -f

# Check network connectivity
docker network inspect newcompany_network

# Rails console access
docker exec -it -w / rails-api sh -lc 'cd /rails && bundle exec rails console'
```

## 📝 Notes

- **Database:** Each deployment should use a separate database
- **Admin Script:** Update `create_admin.rb` with company-specific admin details
- **Environment:** Use different `.env` files for each deployment
- **Domains:** Ensure DNS points to your Dokploy server
- **SSL:** Traefik automatically handles Let's Encrypt certificates for new domains

---

**Created by:** [RysthDesign](https://rysthdesign.com/)
