# Build das imagens Docker para Portainer / Swarm
# Uso: edite as variaveis abaixo e execute na raiz do repositorio:
#   .\scripts\build-docker-images.ps1

$ErrorActionPreference = "Stop"

$VITE_SUPABASE_URL = $env:VITE_SUPABASE_URL
if (-not $VITE_SUPABASE_URL) {
  $VITE_SUPABASE_URL = Read-Host "VITE_SUPABASE_URL (ex: https://xxx.supabase.co)"
}
$VITE_SUPABASE_PUBLISHABLE_KEY = $env:VITE_SUPABASE_PUBLISHABLE_KEY
if (-not $VITE_SUPABASE_PUBLISHABLE_KEY) {
  $VITE_SUPABASE_PUBLISHABLE_KEY = Read-Host "VITE_SUPABASE_PUBLISHABLE_KEY (anon public)"
}
$VITE_BACKEND_URL = $env:VITE_BACKEND_URL
if (-not $VITE_BACKEND_URL) {
  $VITE_BACKEND_URL = Read-Host "VITE_BACKEND_URL (ex: https://api-clinica.conectadiva.com.br)"
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "Building clinica_pro_frontend:latest ..." -ForegroundColor Cyan
docker build -t clinica_pro_frontend:latest `
  --build-arg "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" `
  --build-arg "VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY" `
  --build-arg "VITE_BACKEND_URL=$VITE_BACKEND_URL" `
  .

Write-Host "Building clinica_pro_backend:latest ..." -ForegroundColor Cyan
docker build -t clinica_pro_backend:latest -f backend/Dockerfile backend/

Write-Host ""
Write-Host "Imagens prontas:" -ForegroundColor Green
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | Select-String "clinica_pro"

Write-Host ""
Write-Host "Proximo passo: deploy da stack docker/portainer-stack.yml no Portainer." -ForegroundColor Yellow
