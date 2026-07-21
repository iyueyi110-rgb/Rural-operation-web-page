<#
.SYNOPSIS
  Zouma Village "Cloud Pulse" one-click startup script
  Start order: Docker -> PostgreSQL -> Prisma -> Web(:3000) + Admin(:3001)

.PARAMETER SkipDB
  Skip database startup (when PostgreSQL is already running)

.PARAMETER SkipInstall
  Skip pnpm install

.PARAMETER SkipBrowser
  Do not open browser after startup

.EXAMPLE
  .\start.ps1
  .\start.ps1 -SkipDB -SkipInstall
#>

param(
  [switch]$SkipDB,
  [switch]$SkipInstall,
  [switch]$SkipBrowser
)

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot
Set-Location $RootDir

try { $Host.UI.RawUI.WindowTitle = "Zouma Village Cloud Brain Startup" } catch { }

$FrontendUrl = "http://localhost:3000/zh-CN"
$AdminUrl    = "http://localhost:3001/login"
$FrontendHealthUrl = "http://localhost:3000"
$AdminHealthUrl    = "http://localhost:3001/login"
$ComposeFile = "infra/docker/docker-compose.dev.yml"
$DevCommand = "pnpm turbo dev --filter=@zouma/web --filter=@zouma/admin"

# ---- helpers ----
function Step([string]$msg)  { Write-Host "`n---- $msg ----" -ForegroundColor Cyan }
function Ok([string]$msg)    { Write-Host "  [OK]    $msg" -ForegroundColor Green }
function Warn([string]$msg)  { Write-Host "  [WARN]  $msg" -ForegroundColor Yellow }
function Fail([string]$msg)  { Write-Host "  [ERR]   $msg" -ForegroundColor Red; exit 1 }

function Import-DotEnv([string]$path) {
  $loaded = 0
  foreach ($rawLine in Get-Content -LiteralPath $path -Encoding UTF8) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#")) { continue }

    $separator = $line.IndexOf("=")
    if ($separator -lt 1) { continue }

    $name = $line.Substring(0, $separator).Trim().TrimStart([char]0xFEFF)
    if ($name -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { continue }

    $value = $line.Substring($separator + 1).Trim()
    if ($value.Length -ge 2) {
      $first = $value[0]
      $last = $value[$value.Length - 1]
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }

    [Environment]::SetEnvironmentVariable($name, $value, "Process")
    $loaded++
  }
  return $loaded
}

# Run a native command without tripping PowerShell's error handling on stderr
function Invoke-Native([string]$cmd) {
  $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  cmd /c $cmd
  $ok = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $prev
  return $ok
}

function Get-PortUsage([int]$port) {
  $line = netstat -ano 2>&1 | Select-String ":$port\b" | Select-String "LISTENING" | Select-Object -First 1
  if (-not $line) { return $null }

  $parts = ($line.ToString().Trim() -split "\s+")
  $pidValue = $parts[-1]
  $processName = "unknown"
  try {
    $processName = (Get-Process -Id ([int]$pidValue) -ErrorAction Stop).ProcessName
  } catch { }

  return [pscustomobject]@{
    Port = $port
    PID = $pidValue
    Process = $processName
  }
}

function Stop-PortUsage([int]$port) {
  $usage = Get-PortUsage $port
  if (-not $usage) {
    Ok "Port $port available"
    return
  }

  Warn "Port $($usage.Port) is already used by PID $($usage.PID) ($($usage.Process)); stopping it before launch."
  Invoke-Native "taskkill /PID $($usage.PID) /T /F" | Out-Null

  for ($i = 0; $i -lt 30; $i++) {
    if (-not (Get-PortUsage $port)) { break }
    Start-Sleep -Milliseconds 200
  }

  if (Get-PortUsage $port) {
    Fail "Port $port is still occupied after cleanup. Stop the listed process manually, then run this shortcut again."
  }

  Ok "Port $port released"
}

# ============================================================
#  Environment check
# ============================================================
Step "Environment check"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js not found - https://nodejs.org" }
Ok "Node $(node -v)"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Warn "pnpm not found, enabling via corepack..."
  corepack enable 2>&1 | Out-Null
  corepack prepare pnpm@11.6.0 --activate 2>&1 | Out-Null
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Fail "pnpm setup failed - run: npm i -g pnpm@11" }
}
Ok "pnpm $(pnpm -v)"

if (-not $SkipDB -and -not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail "Docker not found. Install Docker Desktop, or use -SkipDB"
}
if (-not $SkipDB) { Ok "Docker $(docker --version)" }

if (-not (Test-Path ".env.local")) {
  Warn ".env.local missing - creating from .env.example"
  Copy-Item ".env.example" ".env.local" -ErrorAction SilentlyContinue
  Warn "Edit .env.local and set DEEPSEEK_API_KEY / QWEATHER_API_KEY for AI + weather features"
}

$envCount = Import-DotEnv (Join-Path $RootDir ".env.local")
Ok "Loaded $envCount settings from .env.local"

if ([string]::IsNullOrWhiteSpace($env:ADMIN_API_TOKEN)) {
  $env:ADMIN_API_TOKEN = [guid]::NewGuid().ToString("N")
  Warn "ADMIN_API_TOKEN is empty; generated a temporary token for this local session"
}
if ([string]::IsNullOrWhiteSpace($env:ADMIN_SESSION_SECRET)) {
  $env:ADMIN_SESSION_SECRET = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
  Warn "ADMIN_SESSION_SECRET is empty; generated a temporary secret for this local session"
}
if ([string]::IsNullOrWhiteSpace($env:ADMIN_LOGIN_PASSWORD)) {
  $env:ADMIN_LOGIN_PASSWORD = "zouma-demo-local"
  Warn "ADMIN_LOGIN_PASSWORD is empty; local demo password: zouma-demo-local"
}

Step "Stop existing dev servers"
@(3000, 3001) | ForEach-Object { Stop-PortUsage $_ }
Ok "Ports 3000/3001 available"

# ============================================================
#  Dependencies
# ============================================================
Step "Dependencies"

if (-not $SkipInstall) {
  pnpm install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { Fail "pnpm install failed" }
} else {
  Ok "Skipped (-SkipInstall)"
}

# ============================================================
#  Prisma Client
# ============================================================
Step "Prisma Client"

Push-Location "$RootDir/packages/database"
if (-not (Invoke-Native "pnpm exec prisma generate")) { Fail "prisma generate failed" }
Pop-Location
Ok "Prisma Client generated"

# ============================================================
#  PostgreSQL
# ============================================================
if (-not $SkipDB) {
  Step "PostgreSQL"

  # ensure Docker is running
  $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  docker info 2>&1 | Out-Null
  $dockerOk = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $prev
  if (-not $dockerOk) {
    Ok "Starting Docker Desktop..."
    Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe" -WindowStyle Hidden
    for ($i = 0; $i -lt 60; $i++) {
      $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
      docker info 2>&1 | Out-Null
      $dReady = ($LASTEXITCODE -eq 0)
      $ErrorActionPreference = $prev
      if ($dReady) { break }
      Start-Sleep -Seconds 2
    }
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    docker info 2>&1 | Out-Null
    $dReady = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $prev
    if (-not $dReady) { Fail "Docker startup timed out" }
  }

  if (-not (Invoke-Native "docker compose -f `"$ComposeFile`" up -d")) {
    Fail "PostgreSQL container startup failed"
  }

  $pgOk = $false
  for ($i = 0; $i -lt 30; $i++) {
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    docker compose -f $ComposeFile exec -T postgres pg_isready -U zouma 2>&1 | Out-Null
    $pgOk = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $prev
    if ($pgOk) { break }
    Start-Sleep -Seconds 1
  }
  if (-not $pgOk) { Fail "PostgreSQL readiness check timed out" }
  Ok "PostgreSQL ready"

  # migrations + seed
  Step "Database migration & seed"
  Push-Location "$RootDir/packages/database"
  if (-not (Invoke-Native "pnpm exec prisma migrate deploy")) { Fail "prisma migrate deploy failed" }
  Ok "Migration done"

  if (-not (Invoke-Native "pnpm exec prisma db seed")) { Fail "database seed failed" }
  Pop-Location
  Ok "Database ready"
}

# ============================================================
#  Dev servers
# ============================================================
Step "Starting dev servers"

Write-Host "  Frontend  $FrontendUrl" -ForegroundColor White
Write-Host "  Admin     $AdminUrl" -ForegroundColor White
Write-Host "  Command   $DevCommand" -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop all servers`n"

# Start dev servers in background via cmd (pnpm is a .cmd wrapper, needs shell)
$process = Start-Process -FilePath "cmd" `
  -ArgumentList "/c",$DevCommand `
  -WorkingDirectory $RootDir `
  -NoNewWindow `
  -PassThru

# wait for servers
function Wait-ForUrl($url, $label, $seconds = 90) {
  for ($i = 0; $i -lt $seconds; $i++) {
    try { $null = Invoke-WebRequest -Uri $url -TimeoutSec 2 -UseBasicParsing; return $true } catch { }
    Start-Sleep -Seconds 2
  }
  Warn "$label startup timed out"
  return $false
}

if (-not (Wait-ForUrl $FrontendHealthUrl "Frontend")) {
  Invoke-Native "taskkill /PID $($process.Id) /T /F" | Out-Null
  Fail "Frontend health check failed"
}
if (-not (Wait-ForUrl $AdminHealthUrl "Admin")) {
  Invoke-Native "taskkill /PID $($process.Id) /T /F" | Out-Null
  Fail "Admin health check failed"
}

if (-not $process.HasExited) {
  Write-Host ""
  Write-Host "  ==========================================" -ForegroundColor Green
  Write-Host "   Zouma Village system is running!" -ForegroundColor Green
  Write-Host "   Frontend  $FrontendUrl" -ForegroundColor White
  Write-Host "   Admin     $AdminUrl" -ForegroundColor White
  Write-Host "   Press Ctrl+C to stop" -ForegroundColor Green
  Write-Host "  ==========================================" -ForegroundColor Green
  Write-Host ""

  if (-not $SkipBrowser) {
    Start-Process $FrontendUrl
    Start-Process $AdminUrl
  }

  $process.WaitForExit()
} else {
  Fail "Dev server failed to start. Check output above."
}

Write-Host ""
Ok "Stopped. Database container is still running."
Write-Host "  To stop DB: docker compose -f $ComposeFile down"
