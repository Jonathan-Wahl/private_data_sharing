#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${WORKSPACE_FOLDER:-/workspaces/peer_to_peer_downloader}"

if [[ ! -d "${ROOT_DIR}" ]]; then
  cat >&2 <<ERROR
The devcontainer workspace folder does not exist:
  ${ROOT_DIR}

Close the container and rebuild it from the repository root:
  /home/ubuntu/peer_to_peer_downloader
ERROR
  exit 1
fi

cd "${ROOT_DIR}"

if [[ ! -f "AGENTS.md" || ! -f "mobile/package.json" || ! -f "api/Gemfile" ]]; then
  cat >&2 <<ERROR
The devcontainer workspace mount is not pointing at the Secure Share repository.

Expected these files under ${ROOT_DIR}:
  - AGENTS.md
  - mobile/package.json
  - api/Gemfile

Close the container and rebuild it from the repository root:
  /home/ubuntu/peer_to_peer_downloader
ERROR
  exit 1
fi

echo "Checking development toolchain..."

node --version
npm --version
ruby --version
bundle --version
psql --version
sqlite3 --version
redis-cli --version
mysql --version
java -version
sdkmanager --list_installed | grep -E 'platform-tools|platforms;android-3[56]|build-tools;3[56]\.0\.0'

echo "Installing mobile dependencies..."
cd "${ROOT_DIR}/mobile"
npm ci
npx ionic --version
npx cap --version

echo "Installing API dependencies..."
cd "${ROOT_DIR}/api"
bundle config set path vendor/bundle
bundle install
bundle exec rails --version

cat <<'NEXT_STEPS'

Devcontainer is ready.

Run the app workflow with:

  ./start.sh

Dev URLs:
  Mobile web:      http://localhost:4200
  Rails API:       http://localhost:3000
  Emulator noVNC:  http://localhost:16080

Clipboard bridge:
  Copy host text into the emulator:
    emulator-clipboard set "https://example.test/share"
  Read emulator clipboard text:
    emulator-clipboard get
NEXT_STEPS
