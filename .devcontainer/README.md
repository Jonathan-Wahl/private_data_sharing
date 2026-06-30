# Devcontainer Tooling

This folder contains the development environment for an Ionic + Capacitor mobile app and a Ruby on Rails API.

Included tooling:

- Node.js 22 LTS
- Codex CLI
- Git, SSH client, and GitHub CLI
- Ionic CLI
- Capacitor CLI
- Ruby
- Bundler
- Rails 7.2
- Native gem build tooling
- PostgreSQL, SQLite, MySQL/MariaDB, and Redis client tooling
- Java 21
- Android SDK command-line tools
- Android platform tools, Android 35/36 platforms, and build tools 35.0.0/36.0.0
- VS Code extensions for Ionic, Angular, TypeScript, Java, Gradle, and linting

Open `/home/ubuntu/peer_to_peer_downloader` as the folder when rebuilding the devcontainer.
The workspace service bind-mounts that repository to:

```bash
/workspaces/peer_to_peer_downloader
```

The post-create script verifies that the mount contains `AGENTS.md`, `mobile/package.json`,
and `api/Gemfile`; if those files are missing, the rebuild fails with a clear workspace
mount error instead of opening an empty folder.

The workspace service stores `/home/node` in the `devcontainer-home` Docker volume so
editor and CLI sign-ins survive container rebuilds. Remove that named volume only when
you intentionally want to clear saved devcontainer auth state.

Run the app workflow:

```bash
./start.sh
```

The Android emulator starts with the devcontainer. VS Code runs:

```bash
/usr/local/share/secure-share/wait-for-android.sh
```

on container start so ADB waits for Android boot completion before you run the app workflow.
The emulator container intentionally does not persist its Android home/AVD directory,
which avoids reusing a corrupted or half-booted emulator state across rebuilds.
The noVNC view is available at:

```bash
http://localhost:16080/?autoconnect=true
```

If ADB stays `offline` or `unavailable`, inspect the Android sidecar from the host
repository folder:

```bash
docker compose -f .devcontainer/docker-compose.yml logs android-emulator
docker compose -f .devcontainer/docker-compose.yml exec android-emulator cat device_status
docker compose -f .devcontainer/docker-compose.yml rm -sf android-emulator
docker compose -f .devcontainer/docker-compose.yml up -d android-emulator
```

On WSL2 hosts, also confirm KVM is available to Docker. A live noVNC page with
ADB stuck offline usually means the Android guest failed to complete boot rather
than a workspace networking issue.

Run the Ionic dev server by itself:

```bash
cd mobile
npm start -- --host 0.0.0.0
```

Run the Rails API by itself:

```bash
cd api
bundle exec rails server -b 0.0.0.0 -p 3000
```

Only download legal, public-domain, or explicitly licensed torrents/files. Do not add piracy-focused examples.
