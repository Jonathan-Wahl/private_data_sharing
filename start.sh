#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="${ROOT_DIR}/api"
MOBILE_DIR="${ROOT_DIR}/mobile"
WEB_URL="${WEB_URL:-http://localhost:4200}"
ANDROID_SERIAL="${ANDROID_SERIAL:-android-emulator:5555}"
ANDROID_TARGET="${ANDROID_TARGET:-${ANDROID_SERIAL}}"
APP_ID="${APP_ID:-app.secureshare.mobile}"
MAIN_ACTIVITY="${APP_ID}/.MainActivity"

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "${API_PID}" 2>/dev/null || true
  fi
  if [[ -n "${WEB_PID:-}" ]]; then
    kill "${WEB_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

wait_for_http() {
  local url="$1"
  local name="$2"
  local pid="${3:-}"

  echo "Waiting for ${name} at ${url}..."

  for _ in $(seq 1 90); do
    if [[ -n "${pid}" ]] && ! kill -0 "${pid}" 2>/dev/null; then
      wait "${pid}" || true
      echo "${name} process exited before it became ready." >&2
      return 1
    fi

    if curl -fsS "${url}" >/dev/null 2>&1; then
      echo "${name} is ready."
      return 0
    fi

    sleep 2
  done

  echo "${name} did not become ready in time." >&2
  return 1
}

ensure_port_available() {
  local port="$1"
  local name="$2"

  if command -v ss >/dev/null 2>&1; then
    if ss -ltnH | awk '{print $4}' | grep -Eq "(^|:|\\])${port}$"; then
      echo "${name} cannot start because port ${port} is already in use." >&2
      echo "Stop the process using port ${port}, then run ./start.sh again." >&2
      return 1
    fi
  elif curl -fsS "http://127.0.0.1:${port}" >/dev/null 2>&1; then
    echo "${name} cannot start because port ${port} is already serving HTTP." >&2
    echo "Stop the process using port ${port}, then run ./start.sh again." >&2
    return 1
  fi
}

open_url() {
  local url="$1"
  local name="$2"

  if [[ "${OPEN_DEV_URLS:-1}" == "0" ]]; then
    return
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${url}" >/dev/null 2>&1 || true
  elif command -v wslview >/dev/null 2>&1; then
    wslview "${url}" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "${url}" >/dev/null 2>&1 || true
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m webbrowser "${url}" >/dev/null 2>&1 || true
  fi

  echo "${name}: ${url}"
}

require_android_sdk_package() {
  local package="$1"

  if ! sdkmanager --list_installed | grep -Fq "${package}"; then
    cat >&2 <<ERROR
Missing required Android SDK package: ${package}

Rebuild the devcontainer so the updated Android SDK image is used, then run ./start.sh again.
ERROR
    return 1
  fi
}

wait_for_emulator() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "Ensuring Android emulator sidecar is running..."
    docker compose -f "${ROOT_DIR}/.devcontainer/docker-compose.yml" up -d android-emulator >/dev/null 2>&1 || true
  fi

  open_url "http://localhost:16080/?autoconnect=true" "Android emulator noVNC"

  if [[ -x "/usr/local/share/secure-share/wait-for-android.sh" ]]; then
    /usr/local/share/secure-share/wait-for-android.sh
    return
  fi

  "${ROOT_DIR}/.devcontainer/wait-for-android.sh"
}

ensure_port_available 3000 "Rails API"
ensure_port_available 4200 "Ionic web app"
require_android_sdk_package "platforms;android-36"
require_android_sdk_package "build-tools;36.0.0"

echo "Preparing Rails API..."
cd "${API_DIR}"
bundle config set path vendor/bundle
bundle install
bundle exec rails db:prepare
bundle exec rails server -b 0.0.0.0 -p 3000 &
API_PID="$!"

wait_for_http "http://localhost:3000/up" "Rails API" "${API_PID}"

echo "Preparing Ionic mobile app..."
cd "${MOBILE_DIR}"
npm install

echo "Starting Ionic web app..."
npm run start -- --host 0.0.0.0 --port 4200 &
WEB_PID="$!"

wait_for_http "${WEB_URL}" "Ionic web app" "${WEB_PID}"
open_url "${WEB_URL}" "Mobile web"

if [[ ! -d "${MOBILE_DIR}/android" ]]; then
  echo "Adding Capacitor Android platform..."
  npx cap add android
fi

echo "Building web assets for Capacitor..."
npm run build

wait_for_emulator

echo "Forwarding emulator loopback port to the Rails API..."
adb -s "${ANDROID_SERIAL}" reverse tcp:3000 tcp:3000

echo "Installing and launching Android app on ${ANDROID_TARGET} with Capacitor..."
CAP_RUN_STATUS=0
npx cap run android --target "${ANDROID_TARGET}" || CAP_RUN_STATUS="$?"

if [[ "${CAP_RUN_STATUS}" -ne 0 ]]; then
  cat >&2 <<WARNING
Capacitor did not finish launching the app cleanly.
Reconnecting ADB and trying to start the installed app directly...
WARNING
fi

adb connect "${ANDROID_SERIAL}" >/dev/null 2>&1 || true
adb -s "${ANDROID_SERIAL}" wait-for-device
adb -s "${ANDROID_SERIAL}" reverse tcp:3000 tcp:3000

if [[ "${CAP_RUN_STATUS}" -ne 0 ]] && ! adb -s "${ANDROID_SERIAL}" shell pm path "${APP_ID}" >/dev/null 2>&1; then
  echo "Capacitor failed and ${APP_ID} is not installed on ${ANDROID_SERIAL}." >&2
  exit "${CAP_RUN_STATUS}"
fi

adb -s "${ANDROID_SERIAL}" shell am start -W -n "${MAIN_ACTIVITY}"

echo "Secure Share is running:"
echo "  API:     http://localhost:3000"
echo "  Web:     ${WEB_URL}"
echo "  Android: http://localhost:16080 for emulator noVNC"
echo "  Clipboard helper: .devcontainer/emulator-clipboard.sh set \"text to paste\""
echo
echo "Press Ctrl+C to stop the API and Ionic web servers."

wait
