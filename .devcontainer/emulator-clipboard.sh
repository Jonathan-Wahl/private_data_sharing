#!/usr/bin/env bash
set -euo pipefail

ANDROID_SERIAL="${ANDROID_SERIAL:-android-emulator:5555}"
PACKAGE_NAME="${EMULATOR_CLIPBOARD_PACKAGE:-app.secureshare.mobile}"
ACTIVITY_COMPONENT="${PACKAGE_NAME}/.ClipboardBridgeActivity"
ACTION_PREFIX="${PACKAGE_NAME}.debug"

usage() {
  cat <<USAGE
Usage:
  emulator-clipboard.sh set [text]
  emulator-clipboard.sh get

Examples:
  emulator-clipboard.sh set "https://example.test/share"
  printf '%s' "multi-line text" | emulator-clipboard.sh set
  emulator-clipboard.sh get
USAGE
}

require_app() {
  adb start-server >/dev/null
  adb connect "${ANDROID_SERIAL}" >/dev/null 2>&1 || true

  if [[ "$(adb -s "${ANDROID_SERIAL}" get-state 2>/dev/null || true)" != "device" ]]; then
    echo "Android emulator ${ANDROID_SERIAL} is not available." >&2
    exit 1
  fi

  if ! adb -s "${ANDROID_SERIAL}" shell pm path "${PACKAGE_NAME}" >/dev/null 2>&1; then
    cat >&2 <<ERROR
${PACKAGE_NAME} is not installed on ${ANDROID_SERIAL}.

Run ./start.sh first so the debug app, including its clipboard bridge, is installed.
ERROR
    exit 1
  fi
}

read_stdin_if_available() {
  if [[ -t 0 ]]; then
    printf ''
  else
    cat
  fi
}

set_clipboard() {
  local text="$*"
  local payload

  if [[ $# -eq 0 ]]; then
    text="$(read_stdin_if_available)"
  fi

  payload="$(printf '%s' "${text}" | base64 | tr -d '\n')"
  adb -s "${ANDROID_SERIAL}" logcat -c
  adb -s "${ANDROID_SERIAL}" shell am start \
      -n "${ACTIVITY_COMPONENT}" \
      -a "${ACTION_PREFIX}.SET_CLIPBOARD" \
      --es text_base64 "${payload}" >/dev/null

  wait_for_log '^.* OK$' >/dev/null

  echo "Copied text to the Android emulator clipboard."
}

get_clipboard() {
  local encoded

  adb -s "${ANDROID_SERIAL}" logcat -c

  adb -s "${ANDROID_SERIAL}" shell am start \
      -n "${ACTIVITY_COMPONENT}" \
      -a "${ACTION_PREFIX}.GET_CLIPBOARD" >/dev/null

  encoded="$(wait_for_log 'CLIPBOARD_BASE64:' | sed -nE 's/.*CLIPBOARD_BASE64:(.*)$/\1/p' | tail -n 1)"

  if [[ -n "${encoded}" ]]; then
    printf '%s' "${encoded}" | base64 --decode
  fi
}

wait_for_log() {
  local pattern="$1"
  local output

  for _ in $(seq 1 20); do
    output="$(adb -s "${ANDROID_SERIAL}" logcat -d -s SecureShareClipboard:I '*:S')"

    if grep -Eq "${pattern}" <<<"${output}"; then
      grep -E "${pattern}" <<<"${output}" | tail -n 1
      return 0
    fi

    sleep 0.25
  done

  adb -s "${ANDROID_SERIAL}" logcat -d -s SecureShareClipboard:I '*:S' >&2
  exit 1
}

main() {
  local command="${1:-}"

  case "${command}" in
    get)
      require_app
      get_clipboard
      ;;
    set)
      shift
      require_app
      set_clipboard "$@"
      ;;
    -h|--help|help|'')
      usage
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
