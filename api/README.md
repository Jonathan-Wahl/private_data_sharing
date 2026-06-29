# Secure Share API

Rails API for short-lived signaling only. It must not store files, shared text, torrents, plaintext, raw keys, or transferred payload data.

## Endpoints

- `POST /api/signaling_rooms`
- `GET /api/signaling_rooms/:id`
- `POST /api/signaling_rooms/:id/messages`

Rooms expire after 10 minutes. Cleanup runs before signaling requests and through `ExpireSignalingRoomsJob`.

Allowed message types:

- `offer`
- `answer`
- `candidate`
- `encrypted-metadata`

## Setup

```sh
bundle install
bundle exec rails db:prepare
```

## Run

```sh
bundle exec rails server
```

## Validate

```sh
bundle exec rails test
bundle exec rubocop
bundle exec brakeman --no-pager
```
