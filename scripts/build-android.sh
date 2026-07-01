#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="${ROOT_DIR}/mobile"
ANDROID_DIR="${MOBILE_DIR}/android"
ARTIFACT_ROOT="${ARTIFACT_ROOT:-${ROOT_DIR}/artifacts}"
SIGNING_DIR="${ANDROID_SIGNING_DIR:-${ARTIFACT_ROOT}/signing}"
SIGNING_PROPERTIES="${ANDROID_SIGNING_PROPERTIES:-${ANDROID_DIR}/release-signing.properties}"
KEYSTORE_FILE="${ANDROID_KEYSTORE_FILE:-${SIGNING_DIR}/secure-share-upload.jks}"
KEY_ALIAS="${SECURE_SHARE_ANDROID_KEY_ALIAS:-secure-share-upload}"
KEYSTORE_DNAME="${ANDROID_KEYSTORE_DNAME:-CN=Secure Share, OU=Mobile, O=Secure Share, L=Local, ST=Local, C=US}"

usage() {
  cat <<USAGE
Usage: scripts/build-android.sh dev|production|generate-key

Outputs:
  dev         ${ARTIFACT_ROOT}/dev/secure-share-dev.apk
  production ${ARTIFACT_ROOT}/production/secure-share-production.apk

Signing:
  production builds use ${SIGNING_PROPERTIES}.
  generate-key creates ${KEYSTORE_FILE} and updates ${SIGNING_PROPERTIES}.
USAGE
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 36 | tr -d '\n'
    return
  fi

  tr -dc 'A-Za-z0-9_@%+=:,.^-' </dev/urandom | head -c 48
}

generate_key() {
  mkdir -p "${SIGNING_DIR}" "$(dirname "${SIGNING_PROPERTIES}")"

  if [[ -f "${KEYSTORE_FILE}" ]]; then
    echo "Signing key already exists: ${KEYSTORE_FILE}"
    echo "Leaving it unchanged."
    return
  fi

  local store_password
  local key_password
  store_password="$(random_secret)"
  key_password="${store_password}"

  keytool -genkeypair \
    -keystore "${KEYSTORE_FILE}" \
    -storetype PKCS12 \
    -storepass "${store_password}" \
    -keypass "${key_password}" \
    -alias "${KEY_ALIAS}" \
    -keyalg RSA \
    -keysize 4096 \
    -validity 10000 \
    -dname "${KEYSTORE_DNAME}"

  chmod 600 "${KEYSTORE_FILE}"

  cat >"${SIGNING_PROPERTIES}" <<PROPERTIES
storeFile=${KEYSTORE_FILE}
storePassword=${store_password}
keyAlias=${KEY_ALIAS}
keyPassword=${key_password}
PROPERTIES
  chmod 600 "${SIGNING_PROPERTIES}"

  echo "Generated Android signing key: ${KEYSTORE_FILE}"
  echo "Wrote signing properties: ${SIGNING_PROPERTIES}"
}

copy_apk() {
  local source_apk="$1"
  local output_dir="$2"
  local output_name="$3"

  mkdir -p "${output_dir}"
  cp "${source_apk}" "${output_dir}/${output_name}"
  echo "APK written to ${output_dir}/${output_name}"
}

build_dev() {
  cd "${MOBILE_DIR}"
  npm install
  npm run build
  npx cap sync android

  cd "${ANDROID_DIR}"
  ./gradlew :app:assembleDebug

  copy_apk \
    "${ANDROID_DIR}/app/build/outputs/apk/debug/app-debug.apk" \
    "${ARTIFACT_ROOT}/dev" \
    "secure-share-dev.apk"
}

build_production() {
  if [[ ! -f "${SIGNING_PROPERTIES}" ]]; then
    echo "Release signing properties were not found. Generating a signing key first..."
    generate_key
  fi

  cd "${MOBILE_DIR}"
  npm install
  npm run build
  npx cap sync android

  cd "${ANDROID_DIR}"
  ./gradlew :app:assembleRelease

  copy_apk \
    "${ANDROID_DIR}/app/build/outputs/apk/release/app-release.apk" \
    "${ARTIFACT_ROOT}/production" \
    "secure-share-production.apk"
}

mode="${1:-}"

case "${mode}" in
  dev)
    build_dev
    ;;
  production)
    build_production
    ;;
  generate-key)
    generate_key
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
