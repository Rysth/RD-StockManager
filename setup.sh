#!/usr/bin/env bash
set -euo pipefail

blue()  { echo -e "\033[0;34m[INFO]\033[0m $*"; }
green() { echo -e "\033[0;32m[SUCCESS]\033[0m $*"; }
yellow(){ echo -e "\033[1;33m[WARNING]\033[0m $*"; }
red()   { echo -e "\033[0;31m[ERROR]\033[0m $*"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Files used to track the applied project name across runs
PROJECT_NAME_FILE=".project"
PROJECT_NAME_APPLIED_FILE=".project.applied"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    red "No se encontró el comando '$1'. Instálalo y vuelve a intentar."
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# to_pascal_case  <string>
#   Converts a kebab-case or snake_case string to PascalCase.
#   Example: "my-app" → "MyApp", "cool_project" → "CoolProject"
# ---------------------------------------------------------------------------
to_pascal_case() {
  echo "$1" \
    | sed 's/[-_]/ /g' \
    | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1' \
    | sed 's/ //g'
}

# ---------------------------------------------------------------------------
# ask_project_name
#   Prompts the user for a project name.  If one was already stored in
#   .project the previous value is offered as the default (press Enter to
#   keep it).  The chosen name is written to $PROJECT_NAME_FILE and exported
#   as the global $PROJECT_NAME variable.
# ---------------------------------------------------------------------------
ask_project_name() {
  local stored_name=""

  if [[ -f "$PROJECT_NAME_FILE" ]]; then
    stored_name=$(cat "$PROJECT_NAME_FILE")
  fi

  echo ""
  echo -e "\033[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
  echo -e "\033[1;36m  Configuración del nombre del proyecto\033[0m"
  echo -e "\033[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
  echo "  Este nombre se usará para los contenedores y redes de Docker."
  echo "  Usa solo letras, números, guiones o guiones bajos (p.ej. myapp)."
  echo ""

  if [[ -n "$stored_name" ]]; then
    echo -n "  Nombre del proyecto [${stored_name}]: "
  else
    echo -n "  Nombre del proyecto: "
  fi

  read -r input_name

  if [[ -z "$input_name" && -n "$stored_name" ]]; then
    PROJECT_NAME="$stored_name"
  elif [[ -n "$input_name" ]]; then
    PROJECT_NAME="$input_name"
  else
    red "Debes introducir un nombre para el proyecto."
    exit 1
  fi

  # Must start with a letter; only letters, digits, hyphens, underscores allowed
  if [[ ! "$PROJECT_NAME" =~ ^[a-zA-Z][a-zA-Z0-9_-]+$ ]]; then
    red "Nombre inválido: '${PROJECT_NAME}'."
    red "Debe empezar con una letra y contener solo letras, números, '-' o '_'."
    exit 1
  fi

  echo "$PROJECT_NAME" > "$PROJECT_NAME_FILE"
  echo ""
  green "Nombre del proyecto: '${PROJECT_NAME}'"
}

# ---------------------------------------------------------------------------
# update_service_names  <new_name>
#   Patches container_name and network references inside both compose files
#   using the previously-applied name (stored in .project.applied) as the
#   search pattern.  On the very first run the hard-coded defaults are used.
# ---------------------------------------------------------------------------
update_service_names() {
  local new_name="$1"
  local prev_name=""

  if [[ -f "$PROJECT_NAME_APPLIED_FILE" ]]; then
    prev_name=$(cat "$PROJECT_NAME_APPLIED_FILE")
  fi

  blue "Actualizando nombres de servicios en los ficheros compose → '${new_name}'..."

  if [[ -z "$prev_name" ]]; then
    # ── First run: replace the original hard-coded defaults ──────────────
    sed -i \
      -e "s/container_name: base-admin/container_name: ${new_name}-admin/g" \
      -e "s/container_name: base-api/container_name: ${new_name}-api/g" \
      -e "s/container_name: base-storefront/container_name: ${new_name}-storefront/g" \
      -e "s/container_name: base-postgres/container_name: ${new_name}-postgres/g" \
      -e "s/container_name: base-redis/container_name: ${new_name}-redis/g" \
      -e "s/container_name: base-worker/container_name: ${new_name}-worker/g" \
      -e "s/base_network/${new_name}_network/g" \
      docker-compose.dev.yml

    sed -i \
      -e "s/container_name: base-admin/container_name: ${new_name}-admin/g" \
      -e "s/container_name: base-api/container_name: ${new_name}-api/g" \
      -e "s/container_name: base-storefront/container_name: ${new_name}-storefront/g" \
      -e "s/container_name: base-worker/container_name: ${new_name}-worker/g" \
      -e "s/base_network/${new_name}_network/g" \
      docker-compose.yml
  else
    # ── Subsequent run: replace the previously-applied name ──────────────
    sed -i \
      -e "s/container_name: ${prev_name}-admin/container_name: ${new_name}-admin/g" \
      -e "s/container_name: base-admin/container_name: ${new_name}-admin/g" \
      -e "s/container_name: ${prev_name}-api/container_name: ${new_name}-api/g" \
      -e "s/container_name: base-api/container_name: ${new_name}-api/g" \
      -e "s/container_name: ${prev_name}-storefront/container_name: ${new_name}-storefront/g" \
      -e "s/container_name: base-storefront/container_name: ${new_name}-storefront/g" \
      -e "s/container_name: ${prev_name}-postgres/container_name: ${new_name}-postgres/g" \
      -e "s/container_name: base-postgres/container_name: ${new_name}-postgres/g" \
      -e "s/container_name: ${prev_name}-redis/container_name: ${new_name}-redis/g" \
      -e "s/container_name: base-redis/container_name: ${new_name}-redis/g" \
      -e "s/container_name: ${prev_name}-worker/container_name: ${new_name}-worker/g" \
      -e "s/container_name: base-worker/container_name: ${new_name}-worker/g" \
      -e "s/${prev_name}_network/${new_name}_network/g" \
      -e "s/base_network/${new_name}_network/g" \
      docker-compose.dev.yml

    sed -i \
      -e "s/container_name: ${prev_name}-admin/container_name: ${new_name}-admin/g" \
      -e "s/container_name: ${prev_name}-api/container_name: ${new_name}-api/g" \
      -e "s/container_name: ${prev_name}-storefront/container_name: ${new_name}-storefront/g" \
      -e "s/container_name: base-storefront/container_name: ${new_name}-storefront/g" \
      -e "s/container_name: ${prev_name}-worker/container_name: ${new_name}-worker/g" \
      -e "s/${prev_name}_network/${new_name}_network/g" \
      docker-compose.yml
  fi

  echo "$new_name" > "$PROJECT_NAME_APPLIED_FILE"
  green "Ficheros compose actualizados correctamente."
}

# ---------------------------------------------------------------------------
# cleanup_conflicting_containers  <project_name>
#   Explicitly removes containers that use hard-coded names.  docker compose
#   down only removes containers belonging to the current project, so
#   containers from previous runs (or a different project) that own the
#   same container_name will block creation of new ones.
# ---------------------------------------------------------------------------
cleanup_conflicting_containers() {
  local new_name="$1"

  blue "Limpiando contenedores residuales para evitar conflictos de nombres..."

  # Original hard-coded names from the compose files
  docker rm -f base-admin base-api base-storefront base-postgres base-redis base-worker 2>/dev/null || true

  # Names from a previously-applied project
  if [[ -f "$PROJECT_NAME_APPLIED_FILE" ]]; then
    local prev_name
    prev_name=$(cat "$PROJECT_NAME_APPLIED_FILE")
    if [[ "$prev_name" != "$new_name" ]]; then
      docker rm -f "${prev_name}-admin" "${prev_name}-api" "${prev_name}-storefront" "${prev_name}-postgres" "${prev_name}-redis" "${prev_name}-worker" 2>/dev/null || true
    fi
  fi

  green "Limpieza completada."
}

# ---------------------------------------------------------------------------
# ensure_dev_smtp_defaults
#   In development, Rails uses Letter Opener to intercept all emails
#   (visible at http://localhost:3000/letter_opener).  This function just
#   warns if the SMTP placeholder is still set, without overriding values,
#   since no real SMTP is needed locally.
# ---------------------------------------------------------------------------
ensure_dev_smtp_defaults() {
  local smtp_host
  smtp_host=$(grep -m1 '^SMTP_HOST=' .env 2>/dev/null | cut -d '=' -f2- || true)

  if [[ "$smtp_host" == "smtp.example.com" || -z "$smtp_host" ]]; then
    yellow "SMTP_HOST contiene el valor de ejemplo. En desarrollo, Rails usará Letter Opener"
    yellow "para interceptar emails (sin necesidad de SMTP real)."
    yellow "Los correos se pueden ver en: http://localhost:3000/letter_opener"
  else
    blue "SMTP personalizado detectado (SMTP_HOST=${smtp_host}). No se modifica .env."
  fi
}

mobile_process_running() {
  if pgrep -f '/mobile/node_modules/.bin/expo start' >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

start_mobile_app() {
  if [[ ! -f "mobile/package.json" ]]; then
    yellow "No se encontró mobile/package.json. Omitiendo app mobile."
    return 0
  fi

  if mobile_process_running; then
    blue "La app mobile ya parece estar ejecutándose en otra terminal."
    blue "Si deseas reiniciarla, detén ese proceso (Ctrl+C) y vuelve a ejecutar setup.sh."
    return 0
  fi

  require_cmd npm

  if [[ ! -d "mobile/node_modules" ]]; then
    blue "Instalando dependencias de mobile con npm install..."
    (cd mobile && npm install)
  else
    blue "Dependencias de mobile ya instaladas."
  fi

  blue "Iniciando app mobile (Expo LAN) en primer plano para mostrar el QR..."
  yellow "Cuando aparezca el QR, escanéalo con Expo Go en Android. Usa Ctrl+C para detener Expo."
  (cd mobile && npm run start -- --lan --clear)
}

ask_start_mobile_app() {
  echo ""
  echo -n "  ¿Deseas ejecutar también la app mobile (Expo)? [s/N]: "
  read -r run_mobile

  if [[ "$run_mobile" =~ ^[sSkKyY]$ ]]; then
    start_mobile_app
  else
    blue "Omitiendo mobile. Puedes iniciarlo manualmente con:"
    blue "  cd mobile && npm run start -- --lan --clear"
  fi
}

show_mobile_troubleshooting() {
  echo ""
  yellow "Troubleshooting mobile network (Windows + WSL):"
  yellow "Si el telefono no puede ver la API o Metro, ejecuta esto en PowerShell como Administrador:"
  yellow ""
  yellow "  netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3001 connectaddress=172.23.110.245 connectport=3001"
  yellow "  netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8081 connectaddress=172.23.110.245 connectport=8081"
  yellow "  New-NetFirewallRule -DisplayName 'WSL API 3001' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001"
  yellow "  New-NetFirewallRule -DisplayName 'WSL Expo 8081' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8081"
  yellow ""
  yellow "Para verificar que la API responde desde Windows o el telefono:"
  yellow "  http://192.168.18.10:3001/up"
  yellow "  http://172.23.110.245:3001/up"
}


start_containers() {
  # Crear .env si no existe
  if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
      blue "Creando .env desde .env.example..."
      cp .env.example .env
      green ".env creado."
    else
      red "No existe .env ni .env.example. Crea tu .env y vuelve a ejecutar."
      exit 1
    fi
  else
    blue ".env ya existe."
  fi

  # Informar sobre SMTP en desarrollo
  ensure_dev_smtp_defaults

  # Verificar que las carpetas necesarias existen
  if [[ ! -d "admin" ]]; then
    red "La carpeta 'admin' no existe. Asegúrate de que el repositorio esté completo."
    exit 1
  fi

  if [[ ! -d "storefront" ]]; then
    red "La carpeta 'storefront' no existe. Asegúrate de que el repositorio esté completo."
    exit 1
  fi

  if [[ ! -f "backend/Dockerfile" ]]; then
    red "La carpeta 'backend' no existe o le falta Dockerfile. Asegúrate de que el repositorio esté completo."
    exit 1
  fi

  blue "Backend Rails listo (backend/Dockerfile)."

  # Exportar variables del .env (líneas KEY=VALUE sin comentarios)
  set -a
  # shellcheck disable=SC2046
  source <(grep -v '^\s*#' .env | sed 's/\r$//') || true
  set +a

  # Parar contenedores previos de este compose (no falla si no existen)
  blue "Deteniendo contenedores previos..."
  docker compose -f docker-compose.dev.yml down --remove-orphans || true

  # Limpiar contenedores con nombres hard-coded que docker compose down no toca
  cleanup_conflicting_containers "$PROJECT_NAME"

  blue "Levantando contenedores de docker-compose.dev.yml para desarrollo local..."
  blue "Servicios: api (Rails API), worker (Sidekiq), admin (React), postgres, redis"
  blue "Storefront queda deshabilitado por defecto. Para iniciarlo: docker compose -f docker-compose.dev.yml --profile storefront up -d storefront"
  docker compose -f docker-compose.dev.yml up --build --force-recreate -d

  green "Correos (Letter Opener): http://localhost:${PORT}/letter_opener"
  green "Sidekiq UI:              http://localhost:${PORT}/sidekiq"
  green "Admin panel:             http://localhost:5173"
  green "Storefront opcional:     http://localhost:4321"

  # Esperar a que los contenedores arranquen y Rails ejecute db:prepare
  blue "Esperando a que los contenedores se inicien (Rails corre db:prepare al arrancar)..."
  sleep 15

  # Preguntar si se desean ejecutar seeds
  echo ""
  echo -n "  ¿Deseas poblar la base de datos con datos de prueba (seed)? [s/N]: "
  read -r run_seeds
  if [[ "$run_seeds" =~ ^[sSkKyY]$ ]]; then
    blue "Ejecutando seed para poblar la base de datos de desarrollo..."
    if docker compose -f docker-compose.dev.yml exec api bundle exec rails db:seed; then
      green "Base de datos poblada exitosamente."
    else
      yellow "Error al poblar la base de datos. Puedes ejecutarlo manualmente con:"
      yellow "  docker compose -f docker-compose.dev.yml exec api bundle exec rails db:seed"
    fi
  else
    blue "Omitiendo seed. Puedes ejecutarlo manualmente más tarde con:"
    blue "  docker compose -f docker-compose.dev.yml exec api bundle exec rails db:seed"
  fi

  # ---------------------------------------------------------------------------
  # react-doctor: diagnose the React admin codebase
  # Uses bun (already available in the admin container via Dockerfile.dev)
  # ---------------------------------------------------------------------------
  if docker compose -f docker-compose.dev.yml exec -w /app admin sh -lc 'command -v git >/dev/null 2>&1'; then
    blue "Ejecutando react-doctor en el servicio 'admin' (vía bun)..."
    if docker compose -f docker-compose.dev.yml exec -w /app admin bunx react-doctor@latest . --no-ami; then
      green "react-doctor completado exitosamente."
    else
      yellow "react-doctor reportó advertencias o no pudo completar el análisis."
      yellow "Puedes ejecutarlo manualmente con:"
      yellow "  docker compose -f docker-compose.dev.yml exec -w /app admin bunx react-doctor@latest . --no-ami"
    fi
  else
    yellow "Saltando react-doctor: el contenedor admin no tiene 'git' instalado."
    yellow "Eso no bloquea la app; puedes instalar git en la imagen o correr react-doctor manualmente más tarde."
  fi

  ask_start_mobile_app

  show_mobile_troubleshooting

  # Mostrar logs en primer plano
  blue "Mostrando logs de los contenedores (Ctrl+C para salir)..."
  docker compose -f docker-compose.dev.yml logs -f
}

main() {
  cd "$ROOT_DIR"

  blue "Verificando dependencias..."
  require_cmd git
  require_cmd docker
  # Verificar plugin docker compose
  if ! docker compose version >/dev/null 2>&1; then
    red "Se requiere 'docker compose' (plugin). Instálalo y vuelve a intentar."
    exit 1
  fi

  # Prompt for project name and patch compose files
  ask_project_name
  update_service_names "$PROJECT_NAME"

  start_containers
}

main "$@"
