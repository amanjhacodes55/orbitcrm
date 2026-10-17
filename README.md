<p align="center"><img src="public/logo.svg" width="72" alt="OrbitCRM"></p>

# OrbitCRM

A CRM you can shape, automate and extend: **monday-style boards** (grid + kanban), **Pipedrive-style pipelines**, **HubSpot-style automations and app platform**, a **built-in dialer**, and an **app marketplace** with a developer portal, OAuth and admin review.

**Stack:** Next.js 15 (App Router, React 19, TypeScript) · MongoDB + Mongoose · Auth.js (email + Google) · Tailwind CSS 4 · dnd-kit

---

## Features

### CRM
- **Boards with 12 typed columns:** text, status, person, date, number, currency, email, phone, dropdown, checkbox, link, rating. You can add, rename, reorder, resize and delete columns, and edit status labels and colours.
- **Main table (grid):** coloured groups that collapse, inline editing in every cell, quick-add rows, search, filter by person, CSV export.
- **Kanban:** drag cards between stages, with lanes taken from any status column. Shows the total value per stage and has a call button on each card.
- **Item drawer:** every field is editable, plus an activity timeline (field changes with before → after, notes, calls, automation and app events), a note composer, call logging and app side-panels.
- **Templates:** Leads, Deals pipeline, Contacts, Companies, Blank. A new workspace can start with a ready CRM: sample data, 4 working automations and 2 installed apps.
- **Home dashboard:** open pipeline, won value, new leads, calls this week, automation runs, pipeline chart, follow-ups due, recent activity.
- **Teams:** multiple workspaces, invite links, owner / admin / member roles, notifications, dark mode, mobile layout.

### Automations (trigger → conditions → actions)
| Triggers | Actions |
|---|---|
| Item created (optionally in a group) | Set a column value (templated) |
| Column changes (optionally *to* a value) | Move item to group |
| **Catch hook:** a unique URL that receives JSON or form posts | Create an item (on any board, with field mapping) |
| **App trigger:** fired by an installed app | Add a note |
| | Notify everyone, a person column, or a specific user |
| | Send a webhook (custom method and JSON body) |
| | **Run an app action**, mapping its outputs into columns |

- **Conditions:** is, is not, contains, empty, not empty, >, <.
- **Templates:** `{{item.Email}}`, `{{payload.name}}`, `{{outputs.score}}`, `{{today}}`.
- Automations can chain up to 3 levels deep, with loop protection.
- **Run history** keeps 14 days of runs with each step's result. **Test run** executes an automation on demand.

### Integrations
- **Outgoing webhooks:** `item.created`, `item.updated`, `item.deleted`, `activity.created`.
  - Signed with HMAC-SHA256 (`X-Orbit-Signature`).
  - Delivery log, ping test, and auto-disable after 20 consecutive failures.
- **REST API v1** using workspace API keys or app installation tokens.
  - Values can be keyed by column **title**, e.g. `{"Status": "Qualified"}`.
  - Cursor pagination, search, and lookup by field.
- **SSRF protection:** user-supplied URLs (webhooks, HTTP steps, app actions) can't reach private or internal networks in production.

### Developer platform and marketplace
- **Developer portal:** create apps with a listing, category, icon, scopes, OAuth redirect URLs, client ID/secret (shown once, can be rotated) and a signing secret.
- **Surfaces** (embedded pages in sandboxed iframes):
  - **Dialer:** opens when anyone clicks a phone number.
  - **Settings page:** shown under Installed apps.
  - **Item panel:** shown on every item.
- **App SDK** (`/sdk/orbit-app-sdk.js`): `Orbit.init()`, `on("dial")`, `items.get/update`, `activities.log`, `triggers.fire`, `settings.get/save`, `ui.toast/resize/close`. Every call goes through a server bridge that **enforces the installation's scopes**.
- **Triggers and actions** that appear in every workspace's automation builder. Action requests are signed, and their outputs can be mapped into columns.
- **Publishing:** automated listing checks → submit → **platform admin review** (approve, reject or unlist, with notes) → listed in the Marketplace, with notifications at each step.
- **Install:** a consent screen listing scopes, then an installation token. For apps with a backend, there's a full **OAuth 2.0 authorization-code flow** (`/oauth/authorize` → `POST /api/oauth/token`, single-use codes that expire after 10 minutes).
- **Uninstall** revokes the token, deletes the app's webhooks and pauses automations that used it.
- **Reference apps** included, built exactly like third-party apps (plain HTML + SDK):
  - **📞 Softphone:** dialer with keypad, timer, outcome and notes. It logs the call and fires a "Call ended" trigger, and has a settings page.
  - **📈 Lead Scorer:** an automation action with HMAC signature verification, a settings page (scoring weights) and an item panel (score breakdown + re-score).

---

## Quick start

Requirements: Node 20+ and MongoDB.

```bash
git clone <this repo> && cd orbitcrm
cp .env.example .env.local          # set NEXTAUTH_SECRET (openssl rand -base64 32), ADMIN_EMAILS
npm install
npm run dev                          # http://localhost:3001
```

Sign up and choose **"Start with a ready-to-use CRM"**. You get Leads, Deals and Contacts boards with data, 4 automations, and the Softphone and Lead Scorer apps installed.

| Env var | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Public URL and session secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google sign-in (redirect URI: `<url>/api/auth/callback/google`) |
| `ADMIN_EMAILS` | Platform admins who review marketplace apps |
| `ALLOW_PRIVATE_URLS` | `true` lets webhooks reach localhost and private IPs (local development only) |

### Try it in 2 minutes
1. **Grid / kanban:** open *Deals pipeline* → **Kanban**, then drag a deal to *Won*.
2. **Automation:** on *Leads*, set someone's Status to **Qualified**. A deal appears in *Deals pipeline* and the team gets a notification.
3. **Catch hook:** go to *Automations* → copy the "Website form" URL and run the `curl` shown. A new lead appears and is scored automatically by the Lead Scorer app.
4. **Dialer:** open a lead → **Call**. The Softphone app opens inside the CRM. End the call and log it; it appears in the timeline, and the "Call answered → mark Contacted" automation runs.
5. **Build an app:** go to *Developer portal* → **Create app**, fill in the listing, add an action, submit, and approve it as an admin under `/admin/apps`.

## REST API

```bash
# Workspace API key: Settings → API keys
curl -X POST http://localhost:3001/api/v1/boards/BOARD_ID/items \
  -H "Authorization: Bearer orb_key_…" -H "Content-Type: application/json" \
  -d '{"name":"Neha Rao","values":{"Status":"New","Email":"neha@acme.io","Phone":"+91 90000 11111"}}'
```

The full reference is in the app at **`/developer/docs`**: authentication, OAuth, every endpoint, webhook format and signature verification, the SDK, building a dialer, actions, triggers, catch hooks, and review rules.

## Architecture

```
src/app/(pages)            landing, login/register, onboarding, join/[code]
src/app/app/*              CRM: home, boards/[id], automations, marketplace, apps, settings
src/app/developer/*        developer portal, app editor, docs
src/app/admin/apps         marketplace review queue
src/app/oauth/authorize    OAuth consent screen
src/app/demo-apps/*        bundled reference apps (plain HTML + SDK)
src/app/api/*              internal API (session) · api/v1/* public API (tokens) · api/hooks/[token] catch hooks · api/oauth/token
src/lib/items.ts           item create/update/delete → activity log → events
src/lib/events.ts          event bus: signed webhooks + automations
src/lib/automation.ts      automation engine (triggers, conditions, actions, templating, run log)
src/lib/publicApi.ts       bearer-token auth & scope checks for /api/v1
src/lib/outbound.ts        SSRF guard for user-supplied URLs
src/components/board/*     table, kanban (dnd-kit), cells, item drawer, column editor
src/components/AppFrame.tsx  iframe host + SDK bridge
public/sdk/orbit-app-sdk.js  App SDK
```

**Data model:** User · Workspace (members and roles, invite code) · Board (columns, groups) · Item (values keyed by column id) · Activity · Automation · AutomationRun (expires after 14 days) · Webhook · WebhookDelivery (expires after 7 days) · ApiKey · App · Installation · OAuthCode (expires after 10 minutes) · Notification (expires after 30 days).

**Security:**
- Secrets and tokens are stored as SHA-256 hashes. Passwords use bcrypt.
- Every query is scoped to the caller's workspace, so one workspace can't read or edit another's data.
- Role checks on admin routes.
- Server-side scope enforcement for app tokens and the iframe bridge.
- HMAC-signed webhooks and action calls.
- Rate limits on sign-up, the public API and catch hooks.
- SSRF guard on all user-supplied outbound URLs.

## Deploy

```bash
docker build -t orbitcrm . && docker run -p 3001:3001 -e MONGODB_URI=… -e NEXTAUTH_SECRET=… -e NEXTAUTH_URL=https://your-domain orbitcrm
```

On Render: **New → Web Service → this repo → Docker**, then add `MONGODB_URI` (for example a free MongoDB Atlas cluster), `NEXTAUTH_SECRET` and `ADMIN_EMAILS`.
