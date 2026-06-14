@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

set "FRONTEND_URL=http://localhost:3000"
set "ADMIN_URL=http://localhost:3001"
if "%OPEN_BROWSER%"=="" set "OPEN_BROWSER=1"

call :ensurePortFree 3000
if errorlevel 1 goto :failed
call :ensurePortFree 3001
if errorlevel 1 goto :failed

docker info >nul 2>&1
if errorlevel 1 (
  echo Docker is not running. Starting Docker Desktop...
  call :startDockerDesktop
  call :waitForDocker
  if errorlevel 1 goto :failed
)

echo Starting PostgreSQL...
call :dockerCompose -f infra/docker/docker-compose.dev.yml up -d
if errorlevel 1 goto :failed

echo Waiting for database...
powershell -NoProfile -Command "Start-Sleep -Seconds 3"

echo Preparing database schema and seed data...
pushd packages\database
call npx.cmd prisma db push
if errorlevel 1 (
  popd
  goto :failed
)
call npx.cmd prisma db seed
if errorlevel 1 (
  popd
  goto :failed
)
popd

echo.
echo Starting development servers...
start "Zouma dev servers" cmd /k "cd /d ""%ROOT_DIR%"" && pnpm.cmd turbo dev --filter=@zouma/web --filter=@zouma/admin"

call :waitForUrl "%FRONTEND_URL%" "frontend"
if errorlevel 1 goto :failed
call :waitForUrl "%ADMIN_URL%" "admin"
if errorlevel 1 goto :failed

echo.
echo 前台 %FRONTEND_URL%
echo 后台 %ADMIN_URL%
echo.

if "%OPEN_BROWSER%"=="1" (
  start "" "%FRONTEND_URL%"
  start "" "%ADMIN_URL%"
)

echo Startup complete. Keep the "Zouma dev servers" window open while using the site.
pause
exit /b 0

:ensurePortFree
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo Port %~1 is already in use. Please close the old process first.
  exit /b 1
)
exit /b 0

:startDockerDesktop
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
  start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  exit /b 0
)
if exist "%LocalAppData%\Docker\Docker Desktop.exe" (
  start "" "%LocalAppData%\Docker\Docker Desktop.exe"
  exit /b 0
)
start "" "Docker Desktop"
exit /b 0

:waitForDocker
set /a ATTEMPTS=60
:dockerWaitLoop
docker info >nul 2>&1
if not errorlevel 1 exit /b 0
set /a ATTEMPTS-=1
if !ATTEMPTS! LEQ 0 (
  echo Docker did not become ready in time.
  exit /b 1
)
powershell -NoProfile -Command "Start-Sleep -Seconds 2"
goto dockerWaitLoop

:waitForUrl
set /a URL_ATTEMPTS=60
:urlWaitLoop
powershell -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%~1' -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 exit /b 0
set /a URL_ATTEMPTS-=1
if !URL_ATTEMPTS! LEQ 0 (
  echo %~2 did not become ready in time at %~1.
  echo Check the "Zouma dev servers" window for details.
  exit /b 1
)
powershell -NoProfile -Command "Start-Sleep -Seconds 2"
goto urlWaitLoop

:dockerCompose
docker compose version >nul 2>&1
if not errorlevel 1 (
  docker compose %*
  exit /b %ERRORLEVEL%
)
docker-compose --version >nul 2>&1
if not errorlevel 1 (
  docker-compose %*
  exit /b %ERRORLEVEL%
)
echo Docker Compose is not available. Please install Docker Desktop or docker-compose.
exit /b 1

:failed
echo.
echo Startup failed. Please read the message above.
pause
exit /b 1
