# Typical integration shape between an app and a notification provider

Research for [#3](https://github.com/JennferLuo/cohort-005-project-jl/issues/3). Covers Knock, Novu, Courier, MagicBell. Facts only, from official docs (fetched 2026-11-14). No decision.

## Summary matrix

| Concern | Knock | Novu | Courier | MagicBell |
| --- | --- | --- | --- | --- |
| Trigger call | `POST /v1/workflows/{key}/trigger` | `POST /v1/events/trigger` | `POST /send` | `POST /v2/broadcasts` |
| Event / template key | workflow `key` (path) | `name` (workflow trigger id) | `message.template` (or inline `content`) | none. Content goes inline (`title`, `content`, `category`, `topic`) |
| Recipient | `recipients[]` of user ids or inline objects | `to`: subscriberId, subscriber object, topic, or array (max 100) | `message.to`: `user_id`, `email`, `phone_number`, `list_id`, ... | `recipients[]` (1–1000) user objects (`external_id`, `email`, ...) |
| Payload | `data` | `payload` (+ `overrides`) | `data` (+ `routing`) | `custom_attributes`, `action_url`, `overrides` |
| Idempotency | not documented on trigger page (`cancellation_key` exists) | `Idempotency-Key` header (must be enabled by support). `transactionId` for tracing/cancel | `Idempotency-Key` header, 25h default | `Idempotency-Key` header, 24h |
| Returned id | `workflow_run_id` | `transactionId` | `requestId` (= message id for single recipient) | broadcast id |
| User sync | identify or inline at trigger. Knock persists every recipient | subscriber upsert inline or via API. Bulk 500/request | profiles API (POST merge / PUT replace / PATCH). Inline `to` fields do not create profiles | `PUT /users` upsert. `external_id` or `email` |
| Push tokens | channel data `{ <channel_id>: { tokens: [] } }` | subscriber channel credentials `deviceTokens` (max 100) | `PUT /users/{user_id}/tokens/{token}` | `PUT /channels/mobile_push/{apns,fcm,expo}/tokens`, `/channels/web_push/tokens` |
| Outbound status webhooks | yes, 14 `message.*` events incl. delivered, bounced, read, seen | yes, `message.sent/delivered/failed` | yes, `message:updated` with status enum | none found. Pull `GET /events` instead |
| Webhook signature | `x-knock-signature: t=<ms>,s=<b64>`, HMAC-SHA256 over `t.body` | Svix-style `webhook-id/-timestamp/-signature` (`v1,<b64>`) | `courier-signature: t=<ms>,signature=<hex>`, HMAC-SHA256 over `t.raw_body` | n/a |
| In-app feed auth | RS256 JWT signed with your private signing key (enhanced security mode) | `subscriberHash` = HMAC-SHA256(secretKey, subscriberId), hex | JWT minted by your backend via `POST /auth/issue-token` with scopes | HS256 User JWT signed with project secret key |

## 1. Outbound trigger API

### Knock
- `POST /v1/workflows/{key}/trigger`. The `key` is the workflow key. Body: `recipients` (ids or inline objects), `data` (arbitrary), `actor`, `tenant`, `cancellation_key`, `settings`. The endpoint "handles inline identifications for the `actor`, `recipient`, and `tenant` fields". Returns `workflow_run_id`. Runs are async. [Knock trigger API](https://docs.knock.app/api-reference/workflows/trigger)

### Novu
- `POST /v1/events/trigger`, header `Authorization: ApiKey <secret>`. Body: `name` (workflow trigger id, required), `to` (subscriberId string, subscriber object, topic, or array, max 100), `payload`, `overrides`, `actor`, `tenant`, `transactionId`, `context`. [Novu trigger](https://docs.novu.co/api-reference/events/trigger-event)
- Email and phone are not valid standalone recipients. They need a subscriber object that includes a `subscriberId`. [Novu trigger](https://docs.novu.co/api-reference/events/trigger-event)
- `Idempotency-Key` header. Support must enable it. A duplicate key sent while the first request is still in flight returns `409`. Response `201` with `acknowledged`, `status`, `transactionId`. [Novu trigger](https://docs.novu.co/api-reference/events/trigger-event)

### Courier
- `POST https://api.courier.com/send`, bearer API key. `message.to` takes `user_id`, `email`, `phone_number`, or `list_id` (and others). Use `message.template` (stored) or `message.content` (inline). Also `data` and `routing` (`method: all|single`, `channels`). [Courier send](https://www.courier.com/docs/reference/send/message)
- `Idempotency-Key` header with a 25h default and a 1y max (`x-idempotency-expiration`). Returns `requestId`. For a single recipient, the `requestId` is the message id, which you use with the Messages API to read status. [Courier send](https://www.courier.com/docs/reference/send/message)

### MagicBell
- `POST https://api.magicbell.com/v2/broadcasts`, server auth with a Project JWT (made in the dashboard and shown only once). [MagicBell API](https://www.magicbell.com/docs/api), [Project JWT](https://www.magicbell.com/docs/api/authentication/project)
- Body: `title` (required), `content`, `action_url`, `category`, `topic`, `custom_attributes`, `recipients` (1–1000 user objects or filters), `overrides` per channel (`email`, `sms`, `in_app`, `mobile_push`) plus `providers`. There is no stored-workflow key: content is sent inline. [Broadcast](https://www.magicbell.com/docs/primitive/broadcast)
- `Idempotency-Key` header. Results are cached for 24h. Rate limit is 500 req/min per IP. [MagicBell API](https://www.magicbell.com/docs/api)

## 2. Recipient / user sync (who owns name, email, phone, push tokens)

All four key the recipient on **your** stable user id. Contact data is pushed by the app. The provider keeps a copy.

- **Knock**: `id` is required, immutable, and should be a stable value such as your primary key. Reserved fields are `email`, `name`, `avatar`, `phone_number` (E.164), and `timezone`. Custom props are deep-merged on upsert. "Every user sent a notification is identified and persisted". Knock should be treated "as a cache of user information". [Knock users](https://docs.knock.app/concepts/users)
  - Push tokens are stored as channel data keyed by channel id: `{ "<channel_id>": { "tokens": [...] } }`. Setting it overwrites. Knock doesn't validate tokens, so the app must remove stale ones (opt-in deregistration on bounce is available). [Knock channel data](https://docs.knock.app/managing-recipients/setting-channel-data)
- **Novu**: `subscriberId` should be your internal user id. Fields are `firstName`, `lastName`, `email`, `phone`, `locale`, `timezone`, plus free-form `data`. Push uses channel credentials `deviceTokens` (max 100 per channel). Sync modes: just-in-time (inline at trigger), ahead of trigger (API), or bulk (500 per request). [Novu subscribers](https://docs.novu.co/platform/concepts/subscribers)
- **Courier**: a stored profile is optional. "An address in the `to` object sends with no stored profile." Inline `to` fields override the profile "for that message only" and don't create one. Inbox auth is the exception: it registers the user. Fields are `email`, `phone_number` (E.164), `locale`. [Courier users](https://www.courier.com/docs/platform/users/users)
  - Profiles: POST merges, PUT replaces, PATCH applies JSON-patch. Push tokens use a separate Token Management API, `PUT /users/{user_id}/tokens/{token}`, and are not removed by a profile PUT. [Courier replace profile](https://www.courier.com/docs/api-reference/user-profiles/replace-a-profile), [Courier put token](https://www.courier.com/docs/reference/token-management/put-token/)
- **MagicBell**: `PUT /users` upserts. The User has `email`, `external_id`, `first_name`, `last_name`, `custom_attributes`. Tokens are per channel: `PUT /channels/mobile_push/{apns|fcm|expo}/tokens`, `/channels/web_push/tokens`, `/channels/slack/tokens`, `/channels/teams/tokens`. [MagicBell API reference](https://www.magicbell.com/docs/api/reference), [OpenAPI](https://www.magicbell.com/docs/api/openapi.json)

## 3. Inbound webhooks (delivery status) and verification

### Knock
- Events: `message.sent`, `delivered`, `delivery_attempted`, `undelivered`, `bounced`, `complaint`, `seen`, `unseen`, `read`, `unread`, `archived`, `unarchived`, `interacted`, `link_clicked`. [Knock event types](https://docs.knock.app/developer-tools/outbound-webhooks/event-types)
- Payload: `{ __typename, type, created_at, data, event_data }`. Headers: `x-knock-event`, `x-knock-environment-id`, `x-knock-signature`. [Knock webhooks](https://docs.knock.app/developer-tools/outbound-webhooks/overview)
- Verify: the header is `t=<timestamp>,s=<signature>` with the timestamp in **ms**. Compute HMAC-SHA256 over `"<t>.<JSON body>"` with the webhook secret. The example encodes base64. The docs suggest rejecting payloads older than 5 min. [Knock webhooks](https://docs.knock.app/developer-tools/outbound-webhooks/overview)

### Novu
- Message delivery events: `message.sent`, `message.delivered`, `message.failed`. Other groups cover workflow changes, preference updates, and inbound email. [Novu event types](https://docs.novu.co/platform/developer/webhooks/event-types)
- Verify: headers `webhook-id`, `webhook-timestamp`, `webhook-signature` (`v1,<base64>`). The docs example uses the `svix` library, `new Webhook(secret).verify(rawBody, headers)`, on the raw body. A 2xx within 15s counts as success, otherwise Novu retries. [Novu webhooks](https://docs.novu.co/platform/developer/webhooks)

### Courier
- Event types include `message:updated`, `notification:*`, `audiences:*`, `preferences:user:updated`. Message status values are `ENQUEUED`, `SENT`, `DELIVERED`, `OPENED`, `CLICKED`, `UNROUTABLE`, `UNDELIVERABLE`. Ignore unknown types. [Courier event types](https://www.courier.com/docs/monitor/webhooks/events.md)
- Payload: `{ type, data: { id, status, recipient, ... } }`. Several events can share `data.id`. Each destination has a `whsec_...` secret, and destinations are scoped per environment. [Courier outbound webhooks](https://www.courier.com/docs/platform/workspaces/outbound-webhooks/)
- Verify: `courier-signature: t=<ms>,signature=<hex>` = HMAC_SHA256(secret, `"<t>.<raw_body>"`). Compare in constant time. The docs give no tolerance window for `t`. [Courier verify](https://www.courier.com/docs/monitor/webhooks/security.md)

### MagicBell
- The v2 API reference / OpenAPI spec shows no outbound delivery-status webhook or subscription endpoint. Delivery history is pull-based: `GET /events` and `GET /events/{event_id}`. The Notification object carries `status` (`unseen|unread|read|archived`), `sent_at`, `seen_at`, `read_at`, `archived_at`. The webhook docs MagicBell does publish are *inbound* (GitHub/Stripe → MagicBell, storing `webhook_signing_secret`). [MagicBell API reference](https://www.magicbell.com/docs/api/reference), [OpenAPI](https://www.magicbell.com/docs/api/openapi.json). Absence is inferred from these docs. MagicBell does not state it.

## 4. In-app feed auth

- **Knock** (enhanced security mode, off by default, recommended for prod): the backend signs a JWT with **RS256** using the private signing key (`KNOCK_SIGNING_KEY`). Claims: `sub` = user id (required), `iat`, `exp` (Node SDK default 3600s), optional `grants` / `explicit_grants`. The client sends the public API key plus the token (`KnockProvider userToken`). [Knock security](https://docs.knock.app/in-app-ui/security-and-authentication)
- **Novu**: turn on "Security HMAC encryption" on the In-App integration. The server computes `subscriberHash = HMAC-SHA256(secretKey, subscriberId)` as lowercase hex and passes it to `<Inbox subscriberHash>`. A `contextHash` is needed if you use context. Without the hash, anyone who guesses a subscriberId can read that user's feed through the public `applicationIdentifier`. With HMAC enabled and no hash, the Inbox won't load. [Novu prod prep](https://docs.novu.co/platform/inbox/prepare-for-production)
- **Courier**: the backend calls `POST /auth/issue-token` (bearer API key) with `scope` such as `user_id:<id> inbox:read:messages inbox:write:events` (plus preferences / `write:user-tokens` / brands as needed) and `expires_in`. Omitting `expires_in` gives a token that never expires. SDKs don't refresh, so the backend re-mints and the client calls `signIn({userId, jwt})` again. [Courier inbox auth](https://www.courier.com/docs/platform/inbox/authentication)
- **MagicBell**: the backend signs a User JWT with **HS256** using the project Secret Key. Claims: `user_email` and/or `user_external_id` (one required), and `api_key`. The docs examples use a `1y` expiry. [MagicBell user JWT](https://www.magicbell.com/docs/api/authentication/user)

Common shape: the backend holds a secret and mints a per-user credential bound to your user id. The browser never sees the provider secret key.

## 5. State apps keep on their side

Facts the docs imply:
- **Recipient id = your own user id.** All four tell you to use your stable internal id (Knock `id`, Novu `subscriberId`, Courier `user_id`, MagicBell `external_id`), so no provider-id mapping table is required. [Knock users](https://docs.knock.app/concepts/users), [Novu subscribers](https://docs.novu.co/platform/concepts/subscribers), [Courier inbox auth](https://www.courier.com/docs/platform/inbox/authentication), [MagicBell user JWT](https://www.magicbell.com/docs/api/authentication/user)
- **App remains source of truth for contact data.** Knock says to treat it "as a cache". Courier allows profile-less sends. Novu and MagicBell upsert from app data.
- **Provider run/message id** per trigger, if the app wants to correlate later: Knock `workflow_run_id`, Novu `transactionId`, Courier `requestId`, MagicBell broadcast id. Courier says to use `requestId` to look up status. [Courier send](https://www.courier.com/docs/reference/send/message)
- **Idempotency key** per business event, for Novu, Courier, and MagicBell retries (headers above).
- **Signing secrets** server-side: webhook secret(s), plus the feed signing key or secret.
- **Delivery status** lives with the provider. The app only stores it if it consumes webhooks (Knock, Novu, Courier) or polls (MagicBell `GET /events`, Courier Messages API).
- **Push tokens**: the app must forward them to the provider. Knock explicitly leaves stale-token cleanup to the app unless deregistration is enabled. [Knock channel data](https://docs.knock.app/managing-recipients/setting-channel-data)

## Open gaps
- Knock trigger idempotency header: not on the trigger reference page.
- Courier webhook timestamp tolerance: not specified.
- MagicBell outbound webhooks: none found in the v2 docs. Confirm with the vendor if needed.
