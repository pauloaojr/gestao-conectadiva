# Frontend Clínica Pro – build Vite + Nginx
#
# Variáveis de produção (ordem de prioridade):
# 1. Arquivo .env.production na raiz (recomendado — ver .env.production.example)
# 2. --build-arg VITE_* na linha de comando
# 3. scripts/build-docker-images.ps1 ou build-docker-images.sh
#
# Build rápido (com .env.production já criado):
#   docker build -t clinica_pro_frontend:latest .

FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

COPY . .

# Vite carrega .env.production automaticamente em `npm run build`.
# Build-args (--build-arg) sobrescrevem o arquivo somente quando informados.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_BACKEND_URL
RUN set -e; \
  if [ -n "$VITE_SUPABASE_URL" ]; then export VITE_SUPABASE_URL="$VITE_SUPABASE_URL"; fi; \
  if [ -n "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then export VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY"; fi; \
  if [ -n "$VITE_BACKEND_URL" ]; then export VITE_BACKEND_URL="$VITE_BACKEND_URL"; fi; \
  npm run build

FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
