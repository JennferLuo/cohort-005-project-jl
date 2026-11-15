# Hosted Notification Providers: Knock vs Novu vs Courier vs MagicBell

**Question** (GitHub issue #2, "Compare third-party notification providers"): How do Knock, Novu, Courier and MagicBell compare as a hosted notification layer for Cadence? Cadence is a React Router v7 + SQLite video-course web app that sends transactional email through Postmark today.

**Date retrieved:** 2026-11-14. Pricing and plan limits are as of that date and can change.

**Scope:** This document records facts only. It makes no recommendation. Every claim links to a primary source: official docs, an official pricing page, or an official GitHub/npm listing. Where no primary source confirmed a fact, the document says **not confirmed**.

---

## Summary comparison

| Dimension | Knock | Novu | Courier | MagicBell |
|---|---|---|---|---|
| **Channels** | In-app feed, email, SMS, push, chat, webhook | In-app, email, SMS, push, chat | In-app (Inbox), email, SMS, push, chat/DM, webhook | In-app, email, SMS, mobile push, web push, Slack, Teams |
| **Postmark (email)** | Yes | Yes | Yes | Not listed (generic SMTP exists) |
| **Twilio (SMS)** | Yes | Yes | Yes | Yes |
| **FCM / APNs (push)** | Yes / Yes | Yes / Yes | Yes / Yes | Yes / Yes |
| **Web push** | Not listed | No provider named | "Push covers web"; no provider named | Yes (native, VAPID) |
| **React in-app pkg** | `@knocklabs/react` | `@novu/react` | `@trycourier/courier-react` | `@magicbell/react` |
| **Headless hooks** | Yes (`useNotifications`, `useNotificationStore`, `usePreferences`) | Yes (hooks in `@novu/react`) | `useCourier()` client hook | No hooks documented in the current React docs |
| **Realtime** | WebSocket | WebSocket | WebSocket (`listenForUpdates()`) | "Persistent connection"; protocol not named in docs |
| **Preferences** | Channel type, channel, workflow, category, tenant; hosted page | Global plus per-workflow per-channel; critical workflows | Topics and sections with channel choice; hosted page | Per category and channel |
| **Prebuilt pref UI** | Hosted page; React UI built yourself with a hook | `<Inbox />` Preferences view | `<CourierPreferences />` plus hosted page | `UserPreferences` component |
| **Template language** | Liquid | LiquidJS | Handlebars | Liquid (workflows) |
| **Template versioning** | Commit model plus environment promotion | Not documented | Publish snapshots, version history, rollback | Not confirmed |
| **Localization** | Yes (`t` tag), **Enterprise only** | Dashboard Translations (plan not confirmed) | Per-element `locales`; AI Translations on Business | Inbox UI strings only; content not confirmed |
| **Outbound webhooks** | Yes; HMAC-SHA256 `x-knock-signature` | Yes, **Team/Enterprise only**; Svix-signed | Yes; HMAC-SHA256 `courier-signature` | Not confirmed (Events API polling) |
| **Free tier** | 10,000 messages/mo | 10,000 workflow runs/mo | 10,000 sends/mo | 1,000 deliveries/mo |
| **First paid tier** | Starter $250/mo, 50k messages | Pro from $30/mo, 30k runs | Business pay-as-you-go $0.005/send | Startup $249/mo, 50k deliveries |
| **Dev/test** | Environments, per-channel sandbox mode, CLI | Dev/Prod environments, `npx novu dev`, Docker self-host (MIT core) | Production/Test environments, Test email provider, Mock key (Enterprise) | Projects; CLI (`magicbell-cli`); test mode not confirmed |

---

## 1. Channel coverage

### Knock
- **Channel types:** email, in-app feed, in-app guide, push, SMS, chat and webhook ([integrations overview](https://docs.knock.app/integrations/overview)).
- **Email providers:** Knock (built-in, testing only), Amazon SES, Cloudflare Email, MailerSend, Mailgun, Mailjet, Mailtrap, Mandrill, **Postmark**, Resend, SendGrid, SMTP and SparkPost ([email overview](https://docs.knock.app/integrations/email/overview)).
- **SMS providers:** Africa's Talking, Amazon SNS, Mailersend, MessageBird, Modica, Plivo, Sinch, Sinch MessageMedia, Telnyx, **Twilio** and Vonage ([SMS overview](https://docs.knock.app/integrations/sms/overview)).
- **Push providers:** Amazon SNS, **APNs**, Expo, **FCM** and OneSignal. The push page does not mention web push ([push overview](https://docs.knock.app/integrations/push/overview)).
- **Chat:** Slack, Microsoft Teams and Discord ([integrations overview](https://docs.knock.app/integrations/overview)).

### Novu
- **Channel types:** Email, SMS, Push, Chat and In-App ([integrations overview](https://docs.novu.co/platform/integrations/overview)).
- **Email:** 19 providers, including **Postmark**, SendGrid, Amazon SES, Resend, Mailgun, Mailtrap and Custom SMTP ([email integrations](https://docs.novu.co/platform/integrations/email)).
- **SMS:** 38 providers. **Twilio** is first, and AWS SNS, Sinch, Telnyx, Plivo and others follow ([SMS integrations](https://docs.novu.co/platform/integrations/sms)).
- **Push:** **FCM**, Expo Push, **APNs**, OneSignal, Pusher Beams, Pushpad and Push Webhook. The page says push can reach web devices but names no specific web push provider ([push integrations](https://docs.novu.co/platform/integrations/push)).
- **Chat:** Slack, Microsoft Teams, Discord, Google Chat, LINE, Mattermost, Telegram, WhatsApp Business and Zulip ([chat integrations](https://docs.novu.co/platform/integrations/chat)).

### Courier
- **Email:** Amazon SES, SendGrid, Mailgun, **Postmark**, Resend and generic SMTP ([integrations overview](https://www.courier.com/docs/integrations/overview)). The Postmark integration supports a MessageStream override and Postmark templates ([Postmark integration](https://www.courier.com/docs/external-integrations/email/postmark)).
- **SMS:** **Twilio**, Vonage, Sinch, Bird and Plivo ([integrations overview](https://www.courier.com/docs/integrations/overview)).
- **Push:** Firebase **FCM**, Apple **APNs**, Expo and OneSignal. Courier says push covers iOS, Android, web and React Native, but it names no dedicated web push provider ([integrations overview](https://www.courier.com/docs/integrations/overview)).
- **Chat/DM:** Slack, Microsoft Teams, WhatsApp and Discord ([integrations overview](https://www.courier.com/docs/integrations/overview)).
- **In-app:** Courier Inbox, which needs no provider connection ([integrations overview](https://www.courier.com/docs/integrations/overview)).

### MagicBell
- **Email:** Amazon SES, Mailgun, Ping Email, SMTP and SendGrid ([docs index](https://www.magicbell.com/docs)). **Postmark is not listed.** The generic SMTP integration takes a host, port, username and password, and its page does not mention Postmark ([SMTP](https://www.magicbell.com/docs/channels/email/smtp)). Whether Postmark works over SMTP through MagicBell is **not confirmed** by MagicBell docs.
- **SMS:** **Twilio** only ([docs index](https://www.magicbell.com/docs)).
- **Mobile push:** **APNs**, Expo and **FCM** ([docs index](https://www.magicbell.com/docs)).
- **Web push:** A native web push channel with VAPID keys ([web push](https://www.magicbell.com/docs/channels/web_push)).
- **Chat:** Slack (MagicBell SlackBot or Slack) and Microsoft Teams ([docs index](https://www.magicbell.com/docs)).

---

## 2. Hosted in-app feed / inbox

| | Package | Prebuilt components | Headless | Realtime |
|---|---|---|---|---|
| Knock | `@knocklabs/react` (plus `@knocklabs/client`) | `NotificationFeedPopover`, `NotificationFeed`, `NotificationIconButton` | Hooks `useNotifications`, `useNotificationStore`, `useKnockClient` | WebSocket real-time service |
| Novu | `@novu/react` (plus `@novu/js`) | `<Inbox />`, with Bell, Notifications, InboxContent and Preferences | Headless hooks such as `useNotifications` and `useNovu` | WebSocket, on by default |
| Courier | `@trycourier/courier-react` (React 18+), `@trycourier/courier-react-17` | `<CourierInbox />`, `<CourierInboxPopupMenu />`, `<CourierToast />` | `useCourier()` client hook | WebSocket via `inbox.listenForUpdates()` |
| MagicBell | `@magicbell/react` | `Inbox`, `FloatingInbox`, `InlineNotification`, `ToastContainer`, `UserPreferences`, `WebPushButton`, `SlackButton` | None documented in current React docs; `@magicbell/react-headless` is deprecated on npm | "Persistent connection"; protocol not named |

- **Knock:** The React SDK ships prebuilt components and "a complete set of React hooks" ([React overview](https://docs.knock.app/in-app-ui/react/overview)). The headless feed guide uses `useNotifications`, `useNotificationStore` and `useKnockClient` ([headless feed](https://docs.knock.app/in-app-ui/react/headless/feed)). Clients connect to a real-time service over a websocket. The only websocket event is `new-message`, which may be throttled ([socket behavior](https://docs.knock.app/in-app-ui/feeds/socket-behavior)). The older `@knocklabs/react-notification-feed` package is being replaced ([React overview](https://docs.knock.app/in-app-ui/react/overview)).
- **Novu:** The Inbox is "a prebuilt, ready-to-use, and fully customizable UI component" ([Inbox overview](https://docs.novu.co/platform/inbox/overview)). `useNotifications` updates in real time, and a `realtime` flag turns off its WebSocket subscription. `@novu/js` keeps a WebSocket open automatically ([useNotifications](https://docs.novu.co/platform/sdks/react/hooks/use-notifications), [headless mode](https://docs.novu.co/platform/inbox/headless-mode)).
- **Courier:** The components and the `useCourier()` hook are documented on the React SDK page. That page also says `listenForUpdates()` "opens the WebSocket connection required for real-time updates" ([Courier React](https://www.courier.com/docs/sdk-libraries/courier-react-web)).
- **MagicBell:** The React docs list components and props only, with no hooks ([React components](https://www.magicbell.com/docs/libraries/react-headless), [magicbell-react](https://www.magicbell.com/docs/libraries/magicbell-react)). npm marks `@magicbell/react-headless` as deprecated and points to `@magicbell/react` or `magicbell-js` ([npm](https://www.npmjs.com/package/@magicbell/react-headless)). The in-app docs say "MagicBell maintains a persistent connection to deliver notifications in real-time" ([in-app channel](https://www.magicbell.com/docs/channels/in_app)). MagicBell's marketing page says WebSockets ([inbox page](https://www.magicbell.com/inbox)), but the docs do not confirm this.

---

## 3. User preferences

- **Knock:**
  - **Model:** Preferences can be set per channel type, per channel, per workflow and per category. Tenant-specific and tenant-default preference sets are also supported ([preferences overview](https://docs.knock.app/preferences/overview)).
  - **Hosted page:** Knock hosts a preference page for each user, reached through a signed URL, and it is configured in the dashboard. It supports only the `default` preference set ([preferences overview](https://docs.knock.app/preferences/overview)).
  - **React:** There is no prebuilt preference component. You build the UI with the `usePreferences` hook from `@knocklabs/react` or with `@knocklabs/client` `getPreferences` and `setPreferences` ([React preferences](https://docs.knock.app/in-app-ui/react/preferences), [custom preference center](https://docs.knock.app/preferences/custom-preference-center)).
- **Novu:**
  - **Model:** Settings layer as workflow channel defaults, then subscriber global preferences, then subscriber per-workflow preferences. The most specific layer wins. Critical workflows ignore subscriber settings and are hidden from the UI ([preferences](https://docs.novu.co/platform/concepts/preferences)).
  - **UI:** The `<Inbox />` Preferences view shows global and per-workflow channel toggles. `preferenceGroups` groups workflows by tags (SDK 3.4.0+), and `preferencesFilter` filters them ([Inbox preferences](https://docs.novu.co/platform/inbox/configuration/preferences)).
  - **Hosted page:** The docs do not mention a standalone hosted preference page (**not confirmed**).
- **Courier:**
  - **Model:** Topics, grouped into sections, are configured in the Preferences Editor. Each topic defaults to opted in, opted out or required. A section can let the user choose channels: email, sms, push, inbox, direct_message or webhook. When a template is mapped to a topic, Courier enforces the preference on every send ([build a preference center](https://www.courier.com/docs/guides/build-a-preference-center#hosted-page), [preferences editor](https://www.courier.com/docs/recipients/preferences/preferences-editor)).
  - **UI:** The hosted page is served on `view.notificationcenter.app`. For embedding there is the `<courier-preferences>` web component (`@trycourier/courier-ui-preferences`), and `<CourierPreferences />` has been part of `@trycourier/courier-react` since v9.2.0 ([embedding preferences](https://www.courier.com/docs/platform/preferences/embedding-preferences), [Courier React](https://www.courier.com/docs/sdk-libraries/courier-react-web)).
- **MagicBell:**
  - **Model:** Preferences are set per category and per channel. The v2 API saves them with `PUT /channels/user_preferences` ([API v2 reference](https://www.magicbell.com/docs/api/reference), [in-app channel](https://www.magicbell.com/docs/channels/in_app)).
  - **UI:** The React `UserPreferences` component "lets users toggle notification channels per category" ([magicbell-react](https://www.magicbell.com/docs/libraries/magicbell-react)).
  - **Hosted page:** A hosted preference page is **not confirmed**.

---

## 4. Templates

- **Knock:**
  - **Editors:** A visual email editor with prebuilt and custom components, plus a code mode ([template editor](https://docs.knock.app/template-editor/overview)).
  - **Language:** Liquid.
  - **Versioning:** All changes are versioned through Knock's commit model, with a diffs tab. Commits are promoted across environments ([template editor](https://docs.knock.app/template-editor/overview), [environments](https://docs.knock.app/concepts/environments)).
  - **Localization:** Text is wrapped in the `t` tag ([template editor](https://docs.knock.app/template-editor/overview)). Translations (i18n) are **Enterprise-only** ([plans](https://docs.knock.app/manage-your-account/knock-plans), [pricing](https://knock.app/pricing)).
- **Novu:**
  - **Editors:** Email has a WYSIWYG block editor and an HTML code editor. Chat has a block editor and a text editor. SMS, push and in-app use plain fields ([template editors](https://docs.novu.co/platform/workflow/template-editor)).
  - **Language:** LiquidJS ([template editors](https://docs.novu.co/platform/workflow/template-editor)).
  - **Localization:** Dashboard Translations need `language_REGION` locale codes (for example `en_US`) and flag outdated locales. Code-first Framework workflows use your own i18n stack ([translations](https://docs.novu.co/platform/workflow/advanced-features/translations)). Which plans include Translations is **not confirmed**.
  - **Versioning:** Template or workflow version history is **not documented** in the pages reviewed ([workflow](https://docs.novu.co/platform/workflow), [template editors](https://docs.novu.co/platform/workflow/template-editor)). Workflows are edited in Development and promoted to Production ([environments](https://docs.novu.co/platform/concepts/environments)).
- **Courier:**
  - **Editors:** Design Studio is a drag-and-drop editor, and templates can also be managed in code as Elemental JSON through the API ([Design Studio](https://www.courier.com/docs/design/templates/design-studio), [Elemental](https://courier.com/docs/platform/content/elemental)).
  - **Language:** Handlebars, with helpers ([Handlebars helpers](https://www.courier.com/docs/platform/content/template-designer/handlebars-helpers), [variables](https://www.courier.com/docs/design/templates/variables)).
  - **Versioning:** Publishing snapshots the draft as the active version, and version history supports compare and rollback ([templates overview](https://www.courier.com/docs/design/templates/overview#draft-publish-and-version-history)).
  - **Localization:** Each element has a `locales` map, and locale matching is strict ([template translations](https://www.courier.com/docs/design/elemental/locales)). AI Translations are listed on the Business plan ([pricing](https://www.courier.com/pricing)).
- **MagicBell:**
  - **Content:** A broadcast takes `title` and `content` directly, and the content accepts HTML ([broadcast primitive](https://www.magicbell.com/docs/primitive/broadcast), [dashboard broadcast](https://www.magicbell.com/docs/dashboard/broadcast)).
  - **Language:** Workflow steps use Liquid placeholders that read the event payload ([workflows](https://www.magicbell.com/workflows)).
  - **Provider templates:** Email overrides can pass a SendGrid `template_id` ([workflows](https://www.magicbell.com/workflows)).
  - **Not confirmed:** a template editor, template versioning, and content localization. The Inbox integration's `locale` field only localizes built-in UI strings ([API v2 reference](https://www.magicbell.com/docs/api/reference)).

---

## 5. Webhooks back to the app

- **Knock:**
  - **Message events:** `message.sent`, `delivered`, `delivery_attempted`, `undelivered`, `bounced`, `complaint`, `seen`, `unseen`, `read`, `unread`, `archived`, `unarchived`, `interacted` and `link_clicked`.
  - **Other events:** workflow-run events (`workflow_recipient_run.started`, `completed` and `error`) and resource or commit events ([event types](https://docs.knock.app/developer-tools/outbound-webhooks/event-types)).
  - **Signature:** The `x-knock-signature` header has the format `t=<ms>,s=<sig>`. The signature is an HMAC-SHA256 of `timestamp.payload`, and Knock suggests rejecting timestamps older than 5 minutes ([outbound webhooks](https://docs.knock.app/developer-tools/outbound-webhooks/overview)).
  - **Retries:** Knock retries non-2xx responses over a few hours, except for specific 3xx and 4xx codes ([outbound webhooks](https://docs.knock.app/developer-tools/outbound-webhooks/overview)).
  - **Postmark mapping:** Postmark Delivery and Bounce events map to delivered and bounced ([Postmark integration](https://docs.knock.app/integrations/email/postmark)).
- **Novu:**
  - **Plan:** "Outbound webhooks feature is only available in the Team and Enterprise plans" ([webhooks](https://docs.novu.co/platform/developer/webhooks)).
  - **Events:** Endpoints subscribe to event groups: message delivery, workflow changes, preference updates and inbound email ([webhooks](https://docs.novu.co/platform/developer/webhooks)). Message events include `message.sent`, `message.delivered`, `message.failed`, `message.seen` and `message.read` ([webhook events](https://docs.novu.co/platform/developer/webhooks/webhooks)).
  - **Signature:** Requests are Svix-signed with `webhook-id`, `webhook-timestamp` and `webhook-signature` headers, and verification needs the raw body ([webhooks](https://docs.novu.co/platform/developer/webhooks)).
  - **Retries:** Novu does not retry provider sends, so the docs advise subscribing to the failure event ([delivery retries](https://docs.novu.co/platform/developer/delivery-retries)).
- **Courier:**
  - **Events:** `message:updated`, `notification:submitted`, `notification:submission_canceled`, `notification:published`, five `audiences:*` events and `preferences:user:updated` ([webhook events](https://www.courier.com/docs/monitor/webhooks/events)).
  - **Statuses:** Messages move through ENQUEUED, SENT, DELIVERED, OPENED, CLICKED, UNROUTABLE and UNDELIVERABLE ([webhook events](https://www.courier.com/docs/monitor/webhooks/events)).
  - **Signature:** The `courier-signature` header carries `t=` and `signature=`. The signature is HMAC-SHA256 with the endpoint secret (`whsec_…`) ([outbound webhooks](https://courier.com/docs/platform/workspaces/outbound-webhooks), [legacy outbound webhooks](https://docs.courier.com/docs/outbound-webhooks)).
  - **Handler guidance:** Return a 2xx within 10 seconds and make handlers idempotent ([legacy outbound webhooks](https://docs.courier.com/docs/outbound-webhooks)).
- **MagicBell:**
  - **Webhooks:** Outbound webhooks for delivery events are **not confirmed**. The v2 API reference shows no webhook subscription endpoint. It offers `GET /events` and `GET /events/{event_id}`, an event stream for auditing and troubleshooting delivery, and broadcast status through `GET /broadcasts/{id}` ([API v2 reference](https://www.magicbell.com/docs/api/reference)).
  - **Signature:** A signature scheme is **not confirmed**.

---

## 6. Pricing at small scale (as of retrieval, 2026-11-14)

| | Free tier | First paid tier | Overage |
|---|---|---|---|
| **Knock** ([pricing](https://knock.app/pricing)) | **Free $0:** up to 10,000 messages/mo, unlimited stored profiles, workflows and channels; Knock branding; no email client previews | **Starter $250/mo:** 50,000 messages/mo, branding removal, email previews, priority email support | $0.005 per message on Starter |
| **Novu** ([pricing](https://novu.co/pricing)) | **Free $0:** 10,000 workflow runs/mo, 5 workflows, 2 environments, 3 team members, 24h activity retention | **Pro from $30/mo:** 30,000+ runs, 7-day retention, branding removed, advanced email editor | $1.20 per 1K extra runs (Pro and Team). The Team plan ($250/mo) adds outbound webhooks, up to 10 environments and RBAC |
| **Courier** ([pricing](https://www.courier.com/pricing)) | **Developer, free:** 10,000 sends/mo | **Business, pay-as-you-go:** $0.005 per send, every send billed including the first 10,000; adds AI Translations and EU data residency | Not applicable; every send costs $0.005 |
| **MagicBell** ([pricing](https://www.magicbell.com/pricing)) | **Builder $0:** 1,000 deliveries/mo, all integrations, 1 project | **Startup $249/mo:** 50,000 deliveries/mo, 5 projects | $0.0025 per extra delivery; $99 per extra project |

**Billing units differ by vendor:**
- **Knock** counts one message for each successful delivery to one user on one channel. Email plus in-app counts as two. Sandboxed messages do not count ([Knock plans](https://docs.knock.app/manage-your-account/knock-plans)).
- **Novu** bills per workflow run ([pricing](https://novu.co/pricing)).
- **Courier** bills per send ([pricing](https://www.courier.com/pricing)).
- **MagicBell** bills per delivery ([pricing](https://www.magicbell.com/pricing)).

**Not listed:**
- **MAU limits:** none of the four pricing pages lists an MAU limit.
- **Free-tier overage:** the free-tier overage terms for Knock, Novu and MagicBell are not stated.

---

## 7. Local / dev / test mode

- **Knock:**
  - **Environments:** Each account starts with Production. Enabling environments adds Development, and custom environments such as staging can be added. Each environment has isolated data and API keys, and commits are promoted upward. The Knock CLI targets development by default and takes `--environment` ([environments](https://docs.knock.app/concepts/environments)).
  - **Sandbox mode:** Sandbox mode is set per channel per environment, for every channel type except in-app. Knock then never calls the downstream provider and marks messages "Not sent" ([testing workflows](https://docs.knock.app/send-notifications/testing-workflows), [message statuses](https://docs.knock.app/send-notifications/message-statuses)). A trigger can also force it with `sandbox_mode` ([trigger via API](https://docs.knock.app/send-notifications/triggering-workflows/api)).
  - **Built-in test email:** This channel delivers only to Knock account members ([Knock test channel](https://docs.knock.app/integrations/email/knock-test)).
  - **Self-host:** No self-hosted option was found (**not confirmed**).
- **Novu:**
  - **Environments:** Development and Production by default. Custom environments need the Team or Enterprise plan. Integrations are isolated per environment ([environments](https://docs.novu.co/platform/concepts/environments)).
  - **Local dev:** `npx novu@latest dev` opens a tunnel and a **Local** environment in the dashboard for code-first (Framework) workflows. That environment replaces the older Local Studio ([Local Studio](https://docs.novu.co/framework/studio)).
  - **Test mode:** A sandbox mode that skips real providers is **not confirmed**.
  - **Self-host:** Docker Compose uses the setup script at `docker/community/setup.sh` on the `next` branch of `novuhq/novu`. The stack is api, worker, ws, dashboard, MongoDB and Redis, served at `localhost:4000` ([deploy with Docker](https://docs.novu.co/community/self-hosting-novu/deploy-with-docker)). Some cloud-only features are unavailable, including social login ([self-hosting overview](https://docs.novu.co/community/self-hosting-novu/overview)). The core is MIT-licensed, and the `enterprise` folder has a commercial license ([GitHub](https://github.com/novuhq/novu)). The pricing page lists self-host deployment under Enterprise ([pricing](https://novu.co/pricing)).
- **Courier:**
  - **Environments:** Every workspace starts with Production and Test environments and can add up to 18 custom ones, for 20 in total ([workspaces](https://www.courier.com/docs/workspaces/overview)).
  - **Test email:** The Test environment's default email provider delivers only to the address you signed up with ([environments and API keys](https://www.courier.com/docs/platform/workspaces/environments-api-keys)).
  - **Mock key:** A **Mock** key type simulates the full send lifecycle without calling the provider and is **Enterprise-only** ([environments and API keys](https://www.courier.com/docs/platform/workspaces/environments-api-keys)).
  - **CLI:** Courier has a CLI ([build with AI](https://www.courier.com/docs/get-started/build-with-ai)). A `-M` mock flag appears only in a Courier blog post (**not confirmed** in the reference docs).
  - **Self-host:** No self-hosted option was found (**not confirmed**).
- **MagicBell:**
  - **Projects:** The free plan includes 1 project and Startup includes 5 ([pricing](https://www.magicbell.com/pricing)). An explicit dev/prod environment feature is **not confirmed**.
  - **CLI:** The CLI is `magicbell-cli`, a Go binary on npm. `@magicbell/cli` is deprecated ([npm @magicbell/cli](https://www.npmjs.com/package/@magicbell/cli)).
  - **Push tokens:** Mobile push tokens take an `installation_id` of `development` or `production` ([API v2 reference](https://www.magicbell.com/docs/api/reference)).
  - **Sandbox:** A sandbox or test mode that skips real vendors is **not confirmed**.
  - **Self-host:** No self-hosted option was found (**not confirmed**).

---

## Not confirmed (summary)
- MagicBell:
  - Postmark support (only generic SMTP is documented)
  - outbound webhooks and signature scheme
  - template editor, template versioning and content localization
  - hosted preference page
  - dev/test environments or sandbox mode
  - realtime protocol (WebSocket appears only on a marketing page)
- Novu:
  - template/workflow version history
  - which plans include Translations
  - hosted standalone preference page
  - sandbox mode that skips providers
- Courier:
  - CLI `-M` mock flag (blog post only)
  - which plans include outbound webhooks
- Knock: web push provider support (not listed).
- All four: MAU limits (none published) and free-tier overage terms for Knock, Novu and MagicBell.

---

## Sources

**Knock**
- https://knock.app/pricing
- https://docs.knock.app/manage-your-account/knock-plans
- https://docs.knock.app/integrations/overview
- https://docs.knock.app/integrations/email/overview
- https://docs.knock.app/integrations/email/postmark
- https://docs.knock.app/integrations/email/knock-test
- https://docs.knock.app/integrations/sms/overview
- https://docs.knock.app/integrations/push/overview
- https://docs.knock.app/in-app-ui/react/overview
- https://docs.knock.app/in-app-ui/react/headless/feed
- https://docs.knock.app/in-app-ui/feeds/socket-behavior
- https://docs.knock.app/in-app-ui/react/preferences
- https://docs.knock.app/preferences/overview
- https://docs.knock.app/preferences/custom-preference-center
- https://docs.knock.app/template-editor/overview
- https://docs.knock.app/developer-tools/outbound-webhooks/overview
- https://docs.knock.app/developer-tools/outbound-webhooks/event-types
- https://docs.knock.app/concepts/environments
- https://docs.knock.app/send-notifications/testing-workflows
- https://docs.knock.app/send-notifications/message-statuses
- https://docs.knock.app/send-notifications/triggering-workflows/api

**Novu**
- https://novu.co/pricing
- https://docs.novu.co/platform/integrations/overview
- https://docs.novu.co/platform/integrations/email
- https://docs.novu.co/platform/integrations/sms
- https://docs.novu.co/platform/integrations/push
- https://docs.novu.co/platform/integrations/chat
- https://docs.novu.co/platform/inbox/overview
- https://docs.novu.co/platform/inbox/headless-mode
- https://docs.novu.co/platform/sdks/react/hooks/use-notifications
- https://docs.novu.co/platform/inbox/configuration/preferences
- https://docs.novu.co/platform/concepts/preferences
- https://docs.novu.co/platform/workflow
- https://docs.novu.co/platform/workflow/template-editor
- https://docs.novu.co/platform/workflow/advanced-features/translations
- https://docs.novu.co/platform/developer/webhooks
- https://docs.novu.co/platform/developer/webhooks/webhooks
- https://docs.novu.co/platform/developer/delivery-retries
- https://docs.novu.co/platform/concepts/environments
- https://docs.novu.co/framework/studio
- https://docs.novu.co/community/self-hosting-novu/overview
- https://docs.novu.co/community/self-hosting-novu/deploy-with-docker
- https://github.com/novuhq/novu

**Courier**
- https://www.courier.com/pricing
- https://www.courier.com/docs/integrations/overview
- https://www.courier.com/docs/external-integrations/email/postmark
- https://www.courier.com/docs/sdk-libraries/courier-react-web
- https://www.courier.com/docs/guides/build-a-preference-center#hosted-page
- https://www.courier.com/docs/recipients/preferences/preferences-editor
- https://www.courier.com/docs/platform/preferences/embedding-preferences
- https://www.courier.com/docs/design/templates/design-studio
- https://www.courier.com/docs/design/templates/overview#draft-publish-and-version-history
- https://courier.com/docs/platform/content/elemental
- https://www.courier.com/docs/design/elemental/locales
- https://www.courier.com/docs/platform/content/template-designer/handlebars-helpers
- https://www.courier.com/docs/design/templates/variables
- https://courier.com/docs/platform/workspaces/outbound-webhooks
- https://docs.courier.com/docs/outbound-webhooks
- https://www.courier.com/docs/monitor/webhooks/events
- https://www.courier.com/docs/workspaces/overview
- https://www.courier.com/docs/platform/workspaces/environments-api-keys
- https://www.courier.com/docs/get-started/build-with-ai

**MagicBell**
- https://www.magicbell.com/pricing
- https://www.magicbell.com/docs
- https://www.magicbell.com/docs/channels/email/smtp
- https://www.magicbell.com/docs/channels/in_app
- https://www.magicbell.com/docs/channels/web_push
- https://www.magicbell.com/docs/libraries/magicbell-react
- https://www.magicbell.com/docs/libraries/react-headless
- https://www.magicbell.com/docs/api/reference
- https://www.magicbell.com/docs/primitive/broadcast
- https://www.magicbell.com/docs/dashboard/broadcast
- https://www.magicbell.com/workflows
- https://www.magicbell.com/inbox
- https://www.npmjs.com/package/@magicbell/react-headless
- https://www.npmjs.com/package/@magicbell/cli
