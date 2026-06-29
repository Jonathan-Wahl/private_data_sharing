# Secure Share

Privacy-first workspace for encrypted text/file sharing, short-lived signaling, and torrent downloading across mobile, web, and desktop.

## Layout

- `mobile/` - Ionic + Capacitor app.
- `api/` - Rails API for short-lived WebRTC/signaling coordination only.
- `.devcontainer/` - Docker Compose devcontainer with workspace tooling and an Android emulator sidecar.

## What Works

- Encrypt text locally with per-share AES-GCM keys.
- Encrypt selected files locally before creating a portable share code.
- Generate QR images for encrypted share codes.
- Receive/decrypt text and file share codes on device.
- Store transfer history, torrent jobs, and VPN-required preferences locally with Capacitor Preferences.
- Use local/offline signaling by default, or Rails API signaling when `mobile/src/environments/environment*.ts` sets `signalingApiBaseUrl`.
- Download torrents from magnet URIs or `.torrent` files.
- Require an active Android VPN before starting selected torrent jobs.
- Package the Ionic app as an Electron desktop app for Linux and Windows.

## Signaling API

The Rails API is in `api/`. It stores only short-lived room/message metadata for pairing and WebRTC coordination. It rejects payload-like fields such as plaintext, raw keys, files, strings, torrents, and generic payload content.

Endpoints:

- `POST /api/signaling_rooms` creates a room that expires after 10 minutes.
- `GET /api/signaling_rooms/:id` polls active room messages.
- `POST /api/signaling_rooms/:id/messages` appends an `offer`, `answer`, `candidate`, or `encrypted-metadata` message.

Message body example:

```json
{
  "sender_id": "device-a",
  "type": "offer",
  "body": {
    "sdp": "v=0...",
    "type": "offer"
  }
}
```

The mobile development environment defaults to:

```ts
signalingApiBaseUrl: 'http://localhost:3000/api';
```

Production remains blank until you choose a deployed coordination API.

## Privacy Model

- Files and text are encrypted before transfer using AES-GCM.
- Raw keys are only present in the recipient share code/secret and are never sent to the API.
- Shared payloads are not uploaded to cloud storage by this app.
- History and settings are local device state.
- The API is limited to transient signaling metadata and has expiration cleanup plus basic rate limiting.

## Mobile Setup

```sh
cd mobile
npm install
npm start
```

## Devcontainer Android Workflow

Rebuild/reopen the devcontainer first. The devcontainer uses Docker Compose to start:

- `workspace` with Node, Ruby, Bundler, Java, Android SDK, ADB, and project tooling.
- `android-emulator` using a noVNC-enabled Android emulator exposed on host port `16080` and host ADB on port `15555`.

After the rebuilt container is ready:

```sh
./start.sh
```

The script boots the Rails API, boots the Ionic dev server, waits for the emulator, adds the Capacitor Android platform if missing, syncs/builds the app, forwards emulator loopback ports with `adb reverse`, and installs/launches the Android app.

Dev URLs:

- Mobile web: `http://localhost:4200`
- API: `http://localhost:3000`
- Emulator noVNC: `http://localhost:16080`
- Host ADB: `127.0.0.1:15555`

## API Setup

```sh
cd api
bundle install
bundle exec rails db:prepare
bundle exec rails server
```

## Mobile Build

```sh
cd mobile
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

## iOS Build

The iOS project is generated under `mobile/ios`.

```sh
cd mobile
npm run build
npx cap sync ios
npx cap open ios
```

Building and signing iOS requires macOS with Xcode.

## Desktop Build

Electron packaging is configured in `mobile/package.json`.

```sh
cd mobile
npm run desktop:dev
npm run desktop:pack
npm run desktop:dist
```

`desktop:pack` creates an unpacked local build. `desktop:dist` creates installer artifacts for the current host platform.

## Validation

Mobile:

```sh
cd mobile
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

API:

```sh
cd api
bundle exec rails test
bundle exec rubocop
bundle exec brakeman --no-pager
```

The API includes a Brakeman ignore file only for runtime lifecycle warnings from the generated environment: Ruby 3.1.2 is EOL and Rails 7.2 support ends on August 9, 2026. Application-code security warnings remain unsuppressed.

## Platform Boundaries

- Web, Android, and iOS WebView torrent downloads use WebTorrent and require WebRTC-capable torrent swarms and trackers.
- Android can block VPN-required torrent jobs until the OS reports an active VPN transport.
- Android can connect selected VPN Gate OpenVPN profiles in app through the bundled OpenVPN engine and Android VPN consent flow.
- iOS requires a Network Extension/Packet Tunnel target for equivalent in-app OpenVPN support.
- Electron desktop builds download through the main-process WebTorrent engine and save completed files under the user's downloads folder.
