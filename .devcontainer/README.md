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
- Java 17
- Android SDK command-line tools
- Android platform tools, Android 35 platform, and build tools 35.0.0
- VS Code extensions for Ionic, Angular, TypeScript, Java, Gradle, and linting

After opening the folder in the devcontainer, scaffold the app from inside the container:

```bash
ionic start . tabs --type=angular --capacitor --no-git
ionic capacitor add android
```

Run the Ionic dev server:

```bash
ionic serve --host 0.0.0.0 --port 8100
```

Scaffold a Rails API app:

```bash
rails new api --api --database=postgresql
```

Only download legal, public-domain, or explicitly licensed torrents/files. Do not add piracy-focused examples, cloud APIs, backend services, user accounts, or database servers.
