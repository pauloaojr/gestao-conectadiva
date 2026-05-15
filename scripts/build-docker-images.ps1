# Build das imagens Docker para Portainer / Swarm
# Lê VITE_* de .env.production (ou .env) na raiz do repositório.
#
# Uso (na raiz):
#   copy .env.production.example .env.production   # primeira vez
#   # edite .env.production com valores reais
#   .\scripts\build-docker-images.ps1

$ErrorActionPreference = "Stop"

function Read-EnvFile {
  param([string]$Path)
  $result = @{}
  if (-not (Test-Path $Path)) { return $result }
  Get-Content $Path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim()
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    $result[$key] = $val
  }
  return $result
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$fileEnv = @{}
foreach ($name in @(".env.production", ".env")) {
  $merged = Read-EnvFile (Join-Path $root $name)
  foreach ($k in $merged.Keys) { $fileEnv[$k] = $merged[$k] }
}

function Get-Var {
  param([string]$Name)
  if ($env:$Name) { return $env:$Name }
  if ($fileEnv.ContainsKey($Name)) { return $fileEnv[$Name] }
  return $null
}

$VITE_SUPABASE_URL = Get-Var "VITE_SUPABASE_URL"
$VITE_SUPABASE_PUBLISHABLE_KEY = Get-Var "VITE_SUPABASE_PUBLISHABLE_KEY"
$VITE_BACKEND_URL = Get-Var "VITE_BACKEND_URL"

$missing = @()
if (-not $VITE_SUPABASE_URL) { $missing += "VITE_SUPABASE_URL" }
if (-not $VITE_SUPABASE_PUBLISHABLE_KEY) { $missing += "VITE_SUPABASE_PUBLISHABLE_KEY" }
if (-not $VITE_BACKEND_URL) { $missing += "VITE_BACKEND_URL" }

if ($missing.Count -gt 0) {
  Write-Host "Variaveis ausentes: $($missing -join ', ')" -ForegroundColor Red
  Write-Host "Crie .env.production a partir de .env.production.example ou exporte no shell." -ForegroundColor Yellow
  exit 1
}

Write-Host "Usando:" -ForegroundColor Cyan
Write-Host "  VITE_SUPABASE_URL=$VITE_SUPABASE_URL"
Write-Host "  VITE_BACKEND_URL=$VITE_BACKEND_URL"
Write-Host ""

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
Write-Host "Proximo passo: docker service update --force ... ou redeploy da stack no Portainer." -ForegroundColor Yellow
