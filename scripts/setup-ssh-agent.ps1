# Execute UMA VEZ como Administrador (clique direito > Executar com PowerShell como administrador)
# Configura o ssh-agent para iniciar com o Windows e carregar a chave SSH.

$ErrorActionPreference = 'Stop'

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
  )) {
  Write-Host 'Reabrindo como Administrador...' -ForegroundColor Yellow
  Start-Process powershell.exe -Verb RunAs -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $MyInvocation.MyCommand.Path
  )
  exit
}

Write-Host 'Configurando OpenSSH Authentication Agent...' -ForegroundColor Cyan
Set-Service ssh-agent -StartupType Automatic
Start-Service ssh-agent

$keyPath = Join-Path $env:USERPROFILE '.ssh\id_ed25519'
if (Test-Path $keyPath) {
  Write-Host ''
  Write-Host 'Adicione sua chave ao agente (digite a passphrase UMA vez):' -ForegroundColor Yellow
  ssh-add $keyPath
} else {
  Write-Host "Chave nao encontrada: $keyPath" -ForegroundColor Red
}

Write-Host ''
Write-Host 'Servico ssh-agent:' -ForegroundColor Green
Get-Service ssh-agent | Format-Table Status, StartType -AutoSize
Write-Host 'Chaves no agente:' -ForegroundColor Green
ssh-add -l

Write-Host ''
Write-Host 'Pronto. Feche e abra o terminal; git push nao deve pedir passphrase de novo nesta sessao do Windows.' -ForegroundColor Cyan
Write-Host 'Pressione Enter para fechar.'
Read-Host
