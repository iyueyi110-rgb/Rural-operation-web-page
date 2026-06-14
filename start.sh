#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

FRONTEND_URL="http://localhost:3000"
ADMIN_URL="http://localhost:3001"

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "Docker Compose is not available. Please install Docker Desktop or docker-compose."
    exit 1
  fi
}

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -Pn >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ss -ltn | grep -E "[:.]${port}[[:space:]]" >/dev/null 2>&1
  elif command -v netstat >/dev/null 2>&1; then
    netstat -an | grep -E "[:.]${port}[[:space:]].*(LISTEN|LISTENING)" >/dev/null 2>&1
  else
    return 1
  fi
}

ensure_port_free() {
  local port="$1"
  if port_in_use "$port"; then
    echo "Port ${port} is already in use. Please close the old process first."
    exit 1
  fi
}

docker_running() {
  docker info >/dev/null 2>&1
}

start_docker_desktop() {
  echo "Docker is not running. Starting Docker Desktop..."
  case "${OSTYPE:-}" in
    darwin*)
      open -a Docker || true
      ;;
    msys*|cygwin*|win32*)
      powershell.exe -NoProfile -Command "Start-Process 'Docker Desktop'" >/dev/null 2>&1 || true
      ;;
    *)
      echo "Please start Docker manually, then rerun this script."
      ;;
  esac
}

wait_for_docker() {
  local attempts=60
  while ! docker_running; do
    attempts=$((attempts - 1))
    if [ "$attempts" -le 0 ]; then
      echo "Docker did not become ready in time."
      exit 1
    fi
    sleep 2
  done
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts=60

  echo "Waiting for ${label} at ${url}..."
  while [ "$attempts" -gt 0 ]; do
    if command -v curl >/dev/null 2>&1; then
      if curl -fsS "$url" >/dev/null 2>&1; then
        return 0
      fi
    elif command -v wget >/dev/null 2>&1; then
      if wget -q --spider "$url" >/dev/null 2>&1; then
        return 0
      fi
    else
      sleep 8
      return 0
    fi
    attempts=$((attempts - 1))
    sleep 2
  done

  echo "${label} did not become ready in time. Check the dev server output above."
  return 1
}

open_browser() {
  if [ "${OPEN_BROWSER:-1}" != "1" ]; then
    return
  fi

  case "${OSTYPE:-}" in
    darwin*)
      open "$FRONTEND_URL" >/dev/null 2>&1 || true
      open "$ADMIN_URL" >/dev/null 2>&1 || true
      ;;
    msys*|cygwin*|win32*)
      cmd.exe /c start "" "$FRONTEND_URL" >/dev/null 2>&1 || true
      cmd.exe /c start "" "$ADMIN_URL" >/dev/null 2>&1 || true
      ;;
  esac
}

cleanup() {
  if [ -n "${DEV_PID:-}" ]; then
    echo
    echo "Stopping development servers..."
    kill "$DEV_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup INT TERM

ensure_port_free 3000
ensure_port_free 3001

if ! docker_running; then
  start_docker_desktop
  wait_for_docker
fi

echo "Starting PostgreSQL..."
compose_cmd -f infra/docker/docker-compose.dev.yml up -d

echo "Waiting for database..."
sleep 3

echo "Preparing database schema and seed data..."
cd packages/database
npx prisma db push
npx prisma db seed
cd ../..

echo
echo "前台 ${FRONTEND_URL}"
echo "后台 ${ADMIN_URL}"
echo

pnpm turbo dev --filter=@zouma/web --filter=@zouma/admin &
DEV_PID=$!

wait_for_url "$FRONTEND_URL" "frontend"
wait_for_url "$ADMIN_URL" "admin"
open_browser

wait "$DEV_PID"
