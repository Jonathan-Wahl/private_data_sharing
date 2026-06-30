#!/usr/bin/env bash
set -euo pipefail

ANDROID_SERIAL="${ANDROID_SERIAL:-android-emulator:5555}"
ANDROID_BOOT_TIMEOUT_SECONDS="${ANDROID_BOOT_TIMEOUT_SECONDS:-600}"
SLEEP_SECONDS=5

deadline=$((SECONDS + ANDROID_BOOT_TIMEOUT_SECONDS))
offline_attempts=0

echo "Waiting for Android emulator at ${ANDROID_SERIAL}..."

adb start-server >/dev/null

while (( SECONDS < deadline )); do
  adb connect "${ANDROID_SERIAL}" >/dev/null 2>&1 || true

  state="$(adb -s "${ANDROID_SERIAL}" get-state 2>/dev/null || true)"
  if [[ "${state}" == "device" ]]; then
    offline_attempts=0
    boot_completed="$(adb -s "${ANDROID_SERIAL}" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
    boot_anim="$(adb -s "${ANDROID_SERIAL}" shell getprop init.svc.bootanim 2>/dev/null | tr -d '\r' || true)"

    if [[ "${boot_completed}" == "1" && "${boot_anim}" == "stopped" ]]; then
      echo "Android emulator is booted and available through ADB."
      exit 0
    fi

    echo "Android ADB is online; waiting for boot completion..."
  else
    if [[ "${state}" == "offline" ]]; then
      offline_attempts=$((offline_attempts + 1))
      adb reconnect offline >/dev/null 2>&1 || true

      if (( offline_attempts % 6 == 0 )); then
        adb kill-server >/dev/null 2>&1 || true
        adb start-server >/dev/null
      fi
    else
      offline_attempts=0
    fi

    echo "Android ADB state is '${state:-unavailable}'; waiting..."
  fi

  sleep "${SLEEP_SECONDS}"
done

cat >&2 <<ERROR
Android emulator did not become ready within ${ANDROID_BOOT_TIMEOUT_SECONDS} seconds.

Open the noVNC view to inspect the emulator:
  http://localhost:16080/?autoconnect=true

Useful checks from inside the devcontainer:
  adb devices -l
  adb -s ${ANDROID_SERIAL} shell getprop sys.boot_completed

Useful checks from the host repository folder:
  docker compose -f .devcontainer/docker-compose.yml logs android-emulator
  docker compose -f .devcontainer/docker-compose.yml exec android-emulator cat device_status

If ADB stays offline after a rebuild, recreate the Android sidecar so it does
not reuse an old emulator filesystem:
  docker compose -f .devcontainer/docker-compose.yml rm -sf android-emulator
  docker compose -f .devcontainer/docker-compose.yml up -d android-emulator
ERROR

exit 1
