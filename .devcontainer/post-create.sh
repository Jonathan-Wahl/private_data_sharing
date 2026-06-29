#!/usr/bin/env bash
set -euo pipefail

echo "Checking development toolchain..."

node --version
npm --version
codex --version
ruby --version
bundle --version
rails --version
psql --version
sqlite3 --version
redis-cli --version
java -version
ionic --version
cap --version
sdkmanager --list_installed | grep -E 'platform-tools|platforms;android-35|build-tools;35.0.0' || true

cat <<'NEXT_STEPS'

Devcontainer is ready.

Suggested scaffold command when you are ready to create the app:

  ionic start . tabs --type=angular --capacitor --no-git
  ionic capacitor add android

Suggested legal-download app dependencies to evaluate inside the scaffold:

  npm install @capacitor/filesystem @capacitor/preferences

Suggested Rails API scaffold command:

  rails new api --api --database=postgresql

Notes:
- Browser-based torrent libraries such as webtorrent are constrained on mobile WebView,
  especially around TCP/UDP tracker/DHT behavior. A production mobile torrent client
  usually needs a native Android plugin wrapping a maintained BitTorrent engine.
- Keep examples limited to legal, public-domain, or explicitly licensed files.
NEXT_STEPS
