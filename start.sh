#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="${ROOT_DIR}/api"
MOBILE_DIR="${ROOT_DIR}/mobile"
ANDROID_SERIAL="${ANDROID_SERIAL:-android-emulator:5555}"

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "${API_PID}" 2>/dev/null || true
  fi

  if [[ -n "${MOBILE_PID:-}" ]]; then
    kill "${MOBILE_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

wait_for_http() {
  local url="$1"
  local name="$2"

  echo "Waiting for ${name} at ${url}..."

  for _ in $(seq 1 90); do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      echo "${name} is ready."
      return 0
    fi

    sleep 2
  done

  echo "${name} did not become ready in time." >&2
  return 1
}

wait_for_emulator() {
  echo "Connecting to Android emulator at ${ANDROID_SERIAL}..."

  for _ in $(seq 1 90); do
    adb connect "${ANDROID_SERIAL}" >/dev/null 2>&1 || true

    if adb -s "${ANDROID_SERIAL}" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; then
      echo "Android emulator is booted."
      return 0
    fi

    sleep 2
  done

  echo "Android emulator did not boot in time." >&2
  return 1
}

echo "Preparing Rails API..."
cd "${API_DIR}"
bundle config set path vendor/bundle
bundle install
bundle exec rails db:prepare
bundle exec rails server -b 0.0.0.0 -p 3000 &
API_PID="$!"

wait_for_http "http://localhost:3000/up" "Rails API"

echo "Preparing Ionic mobile app..."
cd "${MOBILE_DIR}"
npm install
npm start -- --host 0.0.0.0 &
MOBILE_PID="$!"

wait_for_http "http://localhost:4200" "Ionic dev server"

if [[ ! -d "${MOBILE_DIR}/android" ]]; then
  echo "Adding Capacitor Android platform..."
  npx cap add android
fi

echo "Building and syncing Capacitor Android project..."
npm run build
npx cap sync android

wait_for_emulator

echo "Forwarding emulator loopback ports to workspace services..."
adb -s "${ANDROID_SERIAL}" reverse tcp:3000 tcp:3000
adb -s "${ANDROID_SERIAL}" reverse tcp:4200 tcp:4200

echo "Installing and launching Android app on ${ANDROID_SERIAL}..."
npx cap run android --target "${ANDROID_SERIAL}" --no-sync

echo "Secure Share is running:"
echo "  API:     http://localhost:3000"
echo "  Mobile:  http://localhost:4200"
echo "  Android: http://localhost:16080 for emulator noVNC"
echo
echo "Press Ctrl+C to stop the API and mobile dev server."

wait
