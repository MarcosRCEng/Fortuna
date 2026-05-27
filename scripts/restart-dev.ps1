param(
  [int]$ApiPort = 3000,
  [int]$WebPort = 5173,
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$logDir = Join-Path $root ".codex-run"
$apiLog = Join-Path $logDir "api.log"
$webLog = Join-Path $logDir "web.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Stop-ListenersOnPort {
  param([int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($processId in $processIds) {
    if (-not $processId) {
      continue
    }

    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if (-not $process) {
      continue
    }

    Write-Host "Parando processo $($process.ProcessName) ($processId) na porta $Port..."
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

function Read-DotEnv {
  param([string]$Path)

  $envMap = [ordered]@{}
  if (-not (Test-Path $Path)) {
    return $envMap
  }

  foreach ($line in Get-Content $Path) {
    if ($line -match "^\s*$" -or $line -match "^\s*#") {
      continue
    }

    if ($line -match "^\s*([^=]+?)\s*=\s*(.*)\s*$") {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      $envMap[$name] = $value
    }
  }

  return $envMap
}

function Convert-EnvMapToPowerShell {
  param([System.Collections.IDictionary]$EnvMap)

  $lines = @()
  foreach ($key in $EnvMap.Keys) {
    $escapedValue = [string]$EnvMap[$key] -replace "'", "''"
    $lines += "`$env:$key='$escapedValue'"
  }

  return $lines -join "; "
}

Write-Host "Reiniciando Fortuna em $root"
Write-Host "Interrompendo listeners existentes..."
Stop-ListenersOnPort -Port $ApiPort
Stop-ListenersOnPort -Port $WebPort

Start-Sleep -Seconds 2

$envFile = Join-Path $root ".env.local"
$envMap = Read-DotEnv -Path $envFile
$envMap["API_PORT"] = [string]$ApiPort
$envMap["WEB_PORT"] = [string]$WebPort

$envScript = Convert-EnvMapToPowerShell -EnvMap $envMap

$apiCommand = "Set-Location '$root'; $envScript; corepack pnpm dev:api *> '$apiLog'"
$webCommand = "Set-Location '$root'; `$env:WEB_PORT='$WebPort'; corepack pnpm dev:web *> '$webLog'"

Write-Host "Subindo API na porta $ApiPort..."
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $apiCommand -WindowStyle Hidden | Out-Null

Write-Host "Subindo Front na porta $WebPort..."
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $webCommand -WindowStyle Hidden | Out-Null

Write-Host "Aguardando inicializacao..."
Start-Sleep -Seconds 8

Write-Host ""
Write-Host "URLs:"
Write-Host "  Front: http://localhost:$WebPort"
Write-Host "  API:   http://localhost:$ApiPort/health"
Write-Host ""
Write-Host "Logs:"
Write-Host "  API:   $apiLog"
Write-Host "  Front: $webLog"

if (-not $NoPause) {
  Write-Host ""
  Read-Host "Pressione Enter para fechar esta janela"
}
