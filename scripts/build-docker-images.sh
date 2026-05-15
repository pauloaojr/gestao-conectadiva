#!/usr/bin/env bash
# Build das imagens Docker para Portainer / Swarm
# Lê VITE_* de .env.production (ou .env) na raiz do repositório.
#
# Uso:
#   cp .env.production.example .env.production
#   nano .env.production
#   chmod +x scripts/build-docker-images.sh
#   ./scripts/build-docker-images.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  set -a
  # shellcheck disable=SC1090
  source <(grep -v '^\s*#' "$file" | grep -v '^\s*$' | sed 's/\r$//')
  set +a
}

# .env.production tem prioridade sobre .env
load_env_file "$ROOT/.env"
load_env_file "$ROOT/.env.production"

: "${VITE_SUPABASE_URL:?Defina VITE_SUPABASE_URL em .env.production}"
: "${VITE_SUPABASE_PUBLISHABLE_KEY:?Defina VITE_SUPABASE_PUBLISHABLE_KEY em .env.production}"
: "${VITE_BACKEND_URL:?Defina VITE_BACKEND_URL em .env.production}"

echo "Usando:"
echo "  VITE_SUPABASE_URL=$VITE_SUPABASE_URL"
echo "  VITE_BACKEND_URL=$VITE_BACKEND_URL"
echo ""

echo "Building clinica_pro_frontend:latest ..."
docker build -t clinica_pro_frontend:latest \
  --build-arg VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY \
  --build-arg VITE_BACKEND_URL \
  .

echo "Building clinica_pro_backend:latest ..."
docker build -t clinica_pro_backend:latest -f backend/Dockerfile backend/

echo ""
echo "Imagens prontas:"
docker images | grep clinica_pro || true
echo ""
echo "Proximo passo: docker service update --force ... ou redeploy da stack no Portainer."
