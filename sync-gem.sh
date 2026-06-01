#!/usr/bin/env bash
#
# Sincroniza la gema sri_facturacion entre el repo standalone (que desarrollas/pusheas
# por separado) y la copia vendorizada que usa la app dentro de Docker, y corre los specs.
#
# Docker solo monta ./backend en el contenedor, por eso la app consume la copia en
# backend/vendor/gems/sri_facturacion. Este script mantiene ambas en sincronía.
#
# Uso:
#   ./sync-gem.sh            # standalone  -> vendored (desarrollas en sri_facturacion-gem/)
#   ./sync-gem.sh --reverse  # vendored    -> standalone (desarrollaste en la app y publicas)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STANDALONE="$ROOT/sri_facturacion-gem"
VENDORED="$ROOT/backend/vendor/gems/sri_facturacion"

if [[ "${1:-}" == "--reverse" ]]; then
  SRC="$VENDORED"; DEST="$STANDALONE"
  echo "Sincronizando VENDORED -> STANDALONE (para publicar)"
else
  SRC="$STANDALONE"; DEST="$VENDORED"
  echo "Sincronizando STANDALONE -> VENDORED (para probar en la app)"
fi

# Copiar código y tests (lib/ y spec/) + docs.
rm -rf "$DEST/lib" "$DEST/spec"
cp -r "$SRC/lib" "$SRC/spec" "$DEST/"
[[ -f "$SRC/README.md" ]]    && cp "$SRC/README.md" "$DEST/README.md"
[[ -f "$SRC/CHANGELOG.md" ]] && cp "$SRC/CHANGELOG.md" "$DEST/CHANGELOG.md"

echo "Corriendo specs en: $DEST"
( cd "$DEST" && bundle exec rspec )

echo "✓ Gema sincronizada y specs en verde."
if [[ "${1:-}" == "--reverse" ]]; then
  echo "  Ahora: cd sri_facturacion-gem && git add -A && git commit && git push"
else
  echo "  La app (Docker) ya usa la versión nueva de la gema."
fi
