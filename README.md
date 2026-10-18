<p align="center"><img src="public/logo.svg" width="80" alt="OrbitCRM logo"></p>

<h1 align="center">OrbitCRM</h1>

<p align="center">
  <b>An open-source CRM you can shape, automate and extend.</b><br>
  monday-style boards · Pipedrive-style pipelines · HubSpot-style automations & app platform · omnichannel inbox · built-in dialer
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=next.js">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose-47a248?logo=mongodb&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white">
</p>

---

## Contents

1. [Why OrbitCRM](#why-orbitcrm)
2. [Feature tour](#feature-tour)
   - [Boards & views](#1-boards--views)
   - [CRM essentials](#2-crm-essentials)
   - [Inbox & channels](#3-inbox--channels)
   - [Automations](#4-automations)
   - [Dialer](#5-dialer)
   - [Integrations: webhooks & REST API](#6-integrations-webhooks--rest-api)
   - [Developer platform & marketplace](#7-developer-platform--marketplace)
   - [Themes & Orbi the mascot](#8-themes--orbi-the-mascot)
3. [Quick start](#quick-start)
4. [Configuration](#configuration)
5. [A 5-minute walkthrough](#a-5-minute-walkthrough)
6. [API examples](#api-examples)
7. [Architecture](#architecture)
8. [Data model](#data-model)
9. [Security](#security)
10. [Deployment](#deployment)
11. [Project structure](#project-structure)
12. [Roadmap](#roadmap)

---

### Email compose & threads

Open any lead/contact → **Email** to write an email (To prefilled, Cc, subject, templates with `{{first_name}}`, `{{name}}`, `{{company}}`, `{{me}}`). Every email becomes a thread on the item's **Emails** tab and in the **Inbox** ("New email"), with inline replies; inbound replies to the Email channel land in the same thread. Delivery uses `SMTP_URL` (e.g. `smtps://user:app-password@smtp.gmail.com:465`) — without it emails are saved and marked *Not sent* with a mail-app fallback.

## Why OrbitCRM

Most teams end up stitching together a CRM, a chat tool, a dialer and an automation service like Zapier. OrbitCRM puts all of these in one place, and every part can be reached from outside:

- **Flexible data.** Every list (leads, deals, contacts, companies, or anything else) is a *board* with typed columns you define.
- **Many views of the same data.** Grid, kanban and calendar views, each with its own saved filters, sort and hidden columns.
- **Every channel in one inbox.** Website live chat, email, SMS and WhatsApp conversations link to leads automatically.
- **Automations without code.** Triggers, then conditions, then actions, including incoming webhooks ("catch hooks"), app triggers and app actions.
- **An app platform.** Developers build dialers, settings pages, side panels, triggers and actions. Apps go through a review and are listed in a marketplace where workspaces install them through OAuth.

---

## Feature tour

### 1. Boards & views

| | |
|---|---|
| **Column types** | Text, Status, Person, Date, Number, Currency, Email, Phone, Dropdown, Checkbox, Link, Rating, **Connect boards** (link items across boards, e.g. a Deal ↔ its Contacts) |
| **Table view** | Coloured groups you can collapse and rename, inline editing of every cell, a quick-add row, adjustable column widths, sticky name column |
| **Kanban view** | Drag cards between stages. The total value per stage is shown, lanes can come from any status or dropdown column, and each card has a click-to-call button |
| **Calendar view** | A month grid built from any date column. Drag an item to another day to reschedule it; double-click a day to create an item on it |
| **Saved views** | Each board can have any number of views. Each view keeps its own **filters** (match all or any), **sort** and **hidden columns**, and is shared with the whole team. Double-click a view's name to rename it |
| **Advanced filters** | Operators depend on the column type: *is any of / none of*, *contains*, *is me*, *is overdue / today / in the next 7 days*, *before / after*, *> ≥ < ≤*, *empty / not empty*, *checked*, *has links* |
| **Bulk actions** | Select rows (one at a time or a whole group), then set a column, move to a group, duplicate or delete them all at once. Every change is still logged and still runs automations |
| **Import / export** | CSV import of up to 5,000 rows, with automatic column matching and status labels matched by name. CSV export of the current view |

### 2. CRM essentials

- **Templates:** Leads, Deals pipeline, Contacts, Companies and Blank.
- **Ready-made CRM** for new workspaces: sample data, 5 working automations, a live-chat channel and 2 installed apps.
- **Item drawer:** every field is editable in one place.
  - **Activity timeline:** field changes (with before → after), notes, calls, messages, and automation and app events.
  - **Tasks:** with due dates and assignees.
  - **Apps:** side panels from installed apps.
- **My work:** your open tasks grouped into Overdue, Today, Upcoming and No date, plus every item assigned to you.
- **Home dashboard:** open pipeline, won value, new leads, calls this week, automation runs, pipeline-by-stage chart, follow-ups due, recent activity.
- **Global search (Ctrl/Cmd + K):** searches item names *and every field value*, plus boards, automations and apps, all keyboard-driven.
- **Teams:** multiple workspaces, invite links, owner / admin / member roles, a notification bell, 8 themes and a mobile layout.

### 3. Inbox & channels

| Channel | How messages arrive | How replies go out |
|---|---|---|
| **Website live chat** | A `<script>` tag adds a chat bubble to any website. It's an isolated iframe and stays signed in for returning visitors | Instantly, inside the widget |
| **Email** | Inbound-parse webhook (SendGrid, Mailgun, Postmark…) | SMTP (`SMTP_URL`) |
| **SMS / WhatsApp** | Twilio "message comes in" webhook (form posts are handled natively) or any provider | Twilio API (credentials per channel) or a signed outbound webhook |
| **Custom** | `POST` JSON `{ from, name, text }` | Signed outbound webhook |

- **Three-pane inbox:** conversation list (open / pending / closed / all, filter by channel or "mine", search), the message thread, and a contact panel.
- **Reply** or add an **internal note**. Notes are never sent to the customer.
- **Assign** conversations and **close** or reopen them.
- **Leads are linked automatically:** the contact is matched by email or phone on the channel's board, or a new lead is created with its *Source* set. Every message is also logged on that lead's timeline.
- **Automations:** the trigger "When a message arrives" can filter by channel, keyword or "first message only". The action "Reply to the conversation" sends auto-replies.

### 4. Automations

| Triggers | Actions |
|---|---|
| Item created (optionally in a group) | Set a column value (supports templates) |
| A column changes (optionally *to* a specific value) | Move item to group |
| **Catch hook:** a unique URL that receives JSON or form posts | Create an item on any board, with field mapping |
| **App trigger:** fired by an installed app | Add a note |
| **A message arrives in the Inbox** | Notify everyone, a person column, or a specific user |
| | Send a webhook (custom method and body) |
| | **Run an app action**, mapping its outputs into columns |
| | **Reply to the conversation** |

- **Conditions:** is, is not, contains, empty, >, <.
- **Template variables:** `{{item.Email}}`, `{{payload.name}}`, `{{payload.contact.name}}`, `{{outputs.score}}`, `{{today}}`.
- **Chaining:** automations can trigger other automations up to 3 levels deep, with loop protection.
- **Run history:** 14 days, with the result of each step. A **Test** button runs an automation immediately.

### 5. Dialer

- Click any phone number in a table, card or drawer, and a docked dialer opens.
- If a **dialer app** is installed (e.g. the bundled **Softphone**), it runs inside the CRM, gets a `dial` event, logs the call (outcome, duration, notes) on the item and can fire its own "Call ended" trigger.
- Without a dialer app, a built-in **manual call logger** opens a `tel:` link and records the outcome and duration.

### 6. Integrations: webhooks & REST API

- **Outgoing webhooks:** `item.created`, `item.updated`, `item.deleted`, `activity.created`.
  - Signed with HMAC-SHA256 (`X-Orbit-Signature`).
  - Delivery log, ping test, and automatic disabling after 20 consecutive failures.
- **REST API v1:** authenticate with workspace **API keys** or app **installation tokens** (limited to the app's scopes).
  - Read and write boards, items, activities and webhook subscriptions, and fire triggers.
  - Values can be keyed by column **title**, e.g. `{"Status": "Qualified"}`.
  - Cursor pagination, search and lookup by field.

### 7. Developer platform & marketplace

- **Developer portal:** create apps with a listing, category and icon, scopes, OAuth redirect URLs, a client ID/secret (shown once, can be rotated) and a signing secret.
- **Surfaces** (embedded pages in sandboxed iframes): a **Dialer**, a **Settings page** and an **Item panel**.
- **App SDK** (`/sdk/orbit-app-sdk.js`): `Orbit.init()`, `on("dial")`, `items.get/update`, `activities.log`, `triggers.fire`, `settings.get/save`, `ui.toast/resize/close`. Each call goes through a server-side bridge that **checks the installation's scopes**.
- **Triggers and actions** appear in every workspace's automation builder. Action requests are HMAC-signed, and their outputs can be mapped into columns.
- **Publishing:** automated listing checks → submit → **platform-admin review** (approve, reject or unlist, with notes) → listed in the Marketplace. The developer is notified at each step.
- **Install:** a consent screen that lists the scopes. For apps with their own backend there's a full **OAuth 2.0 authorization-code flow** (`/oauth/authorize` → `POST /api/oauth/token`; single-use codes that expire after 10 minutes).
- **Uninstall** revokes the token immediately, removes the app's webhooks and pauses automations that used it.
- **Reference apps** are included and built exactly like third-party apps (plain HTML + SDK):
  - 📞 **Softphone:** dialer with call logging, a "Call ended" trigger and a settings page.
  - 📈 **Lead Scorer:** a signed automation action, a settings page and an item panel.

Full developer documentation is in the app at **`/developer/docs`**.

### 8. Themes & Orbi the mascot

Pick a vibe from the 🎨 button in the top bar or under **Settings → Appearance**. Themes change **colours, fonts, corner radius, border weight, shadow style and background art**, not just colours. The choice is saved to your account and applied before the first paint, so the page never flashes the wrong theme.

| Theme | Feel |
|---|---|
| Orbit Light / Orbit Night | Clean default and its dark twin |
| **Hedgehog Retro** | PostHog-inspired: warm paper, dotted grid, bold ink borders, chunky offset shadows, Space Grotesk |
| Sunset · Ocean · Forest | Warm coral, teal breeze and earthy green, each with gradient backgrounds |
| **Candy** | Playful pastels, pill buttons, Fredoka font |
| **Neon Midnight** | Dark with glowing purple and cyan |

**Orbi** is a friendly little planet with a ring, and OrbitCRM's mascot. It's drawn entirely in SVG (`src/components/art/`) with 11 poses: wave, phone, search, celebrate, sleep, rocket, think, mail, puzzle, zap, happy. It appears on the landing page, sign-in, onboarding, the dashboard banner, every empty state and the 404 page. Every illustration is painted with theme variables, so Orbi **changes colour with each theme**, and in Retro it gets bold ink outlines.

---

## Quick start

**Requirements:** Node.js 20+ and MongoDB 6+, either local or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster.

```bash
git clone https://github.com/amanjhacodes55/orbitcrm.git
cd orbitcrm
cp .env.example .env.local     # then edit: NEXTAUTH_SECRET, ADMIN_EMAILS, MONGODB_URI
npm install
npm run dev                    # → http://localhost:3001
```

Create an account and choose **"Start with a ready-to-use CRM"**.

| Script | Purpose |
|---|---|
| `npm run dev` | Development server on port 3001 |
| `npm run build && npm start` | Production build and server |
| `npm run lint` | ESLint |

## Configuration

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `NEXTAUTH_URL` | ✅ | Public URL of the app (used for OAuth callbacks, widget and webhook URLs) |
| `NEXTAUTH_SECRET` | ✅ | Session secret: `openssl rand -base64 32` |
| `ADMIN_EMAILS` | | Comma-separated **platform admins** who review marketplace apps |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | | Enables "Continue with Google" (redirect URI: `<NEXTAUTH_URL>/api/auth/callback/google`) |
| `SMTP_URL` / `SMTP_FROM` | | Outgoing email for the Email channel, e.g. `smtps://user:pass@smtp.gmail.com` |
| `ALLOW_PRIVATE_URLS` | | `true` lets webhooks, actions and outbound channel calls reach localhost or private IPs (**local development only**) |

## A 5-minute walkthrough

1. **Kanban:** open *Deals pipeline* and drag a deal to **Won**. The stage totals update.
2. **Saved views:** on *Leads*, click **+ View → Table**, add a filter (*Status is any of Qualified*) and a sort, and hide a column. Reload the page: the view keeps them.
3. **Calendar:** click **+ View → Calendar** and drag a lead to next Monday to reschedule its follow-up.
4. **Automation:** set a lead's Status to **Qualified**. A deal is created in *Deals pipeline* and the team gets a notification.
5. **Live chat:** go to *Settings → Channels*, open the chat preview (or paste the snippet on any HTML page) and send a message.
   - The visitor gets an instant auto-reply.
   - The conversation appears in the **Inbox**, already linked to a new lead.
   - Reply from the Inbox and the visitor sees it in the widget.
6. **Catch hook:** go to *Automations*, copy the "Website form" URL and run the `curl` shown. A new lead appears and the **Lead Scorer** app scores it.
7. **Dialer:** open a lead and click **Call**. The Softphone app opens inside the CRM. Log the call, and the "Call answered → mark Contacted" automation runs.
8. **Build an app:** go to *Developer portal → Create app*, add an action, submit it, and approve it at `/admin/apps`.

## API examples

```bash
# Create a lead (workspace API key from Settings → API keys)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
curl -X POST $ORBIT/api/v1/boards/$BOARD/items \
  -H "Authorization: Bearer orb_key_…" -H "Content-Type: application/json" \
  -d '{"name":"Neha Rao","values":{"Status":"New","Email":"neha@acme.io","Phone":"+91 90000 11111"}}'

# Find a lead by email
curl "$ORBIT/api/v1/boards/$BOARD/items?field=Email&value=neha@acme.io" -H "Authorization: Bearer orb_key_…"

# Push a WhatsApp/SMS/custom message into the Inbox
curl -X POST $ORBIT/api/public/inbound/ch_xxx -H "Content-Type: application/json" \
  -d '{"from":"+919811122233","name":"Arnav","text":"Price for 10 users?"}'

# Trigger an automation from any system (catch hook)
curl -X POST $ORBIT/api/hooks/hook_xxx -H "Content-Type: application/json" \
  -d '{"name":"Neha","email":"neha@acme.io","message":"Need a demo"}'
```

Verifying a webhook signature (Node.js):

```js
import crypto from "node:crypto";
const expected = "sha256=" + crypto.createHmac("sha256", process.env.ORBIT_WEBHOOK_SECRET).update(rawBody).digest("hex");
if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers["x-orbit-signature"]))) return res.status(401).end();
```

## Architecture

```mermaid
flowchart LR
  UI[Next.js UI<br/>boards · inbox · builder] -->|session| API[Route handlers /api/*]
  Ext[External systems] -->|API key / app token| V1[/api/v1/*]
  Web[Website widget<br/>Twilio · email parse] --> PUB[/api/public/*]
  Hooks[Forms / Zapier] --> CH[/api/hooks/:token]
  API & V1 & PUB & CH --> SVC[Services<br/>items · inbox · automation]
  SVC --> DB[(MongoDB)]
  SVC --> BUS{Event bus}
  BUS --> WH[Signed webhooks] --> OUT[(Subscribers)]
  BUS --> AUTO[Automation engine] --> SVC
  AUTO --> APPS[App action endpoints]
  UI -. iframe + SDK .-> AF[Embedded apps] -->|bridge, scope-checked| API
```

- **`lib/items.ts`** is the only place items change. Every change creates an activity entry and an event.
- **`lib/events.ts`** sends this event's webhooks first (so subscribers receive events in the order they happened), then runs automations, which may start further events.
- **`lib/automation.ts`** handles triggers → conditions → actions, `{{templates}}`, chaining depth and run logs.
- **`lib/inbox.ts`** handles inbound messages, contact matching, lead linking, delivery per channel, notifications and the message trigger.
- **`lib/publicApi.ts`** handles bearer-token authentication and scope checks for `/api/v1`. **`lib/outbound.ts`** is the SSRF guard for all user-supplied outbound URLs.

## Data model

| Collection | Purpose |
|---|---|
| `users`, `workspaces` | Accounts; members with roles; invite code |
| `boards` | Columns (typed, options, relation target), groups, **saved views** (filters / sort / hidden / per-view settings) |
| `items` | Rows; `values` keyed by column id |
| `activities` | Timeline: created, update (diff), note, call, message, automation, app, **task** (due, done, assignee) |
| `automations`, `automationruns` | Trigger / conditions / actions; run log (expires after 14 days) |
| `channels`, `conversations`, `messages` | Inbox: channel config + public token; contact; status / assignee / unread; in / out / internal-note messages |
| `webhooks`, `webhookdeliveries`, `apikeys` | Integrations (deliveries expire after 7 days) |
| `apps`, `installations`, `oauthcodes` | Developer platform (OAuth codes expire after 10 minutes) |
| `notifications` | Bell notifications (expire after 30 days) |

## Security

- **Secrets:** passwords are hashed with bcrypt. API keys, installation tokens, client secrets and chat visitor tokens are stored only as SHA-256 hashes.
- **Workspace isolation:** every query is scoped to the caller's workspace, so one workspace can't read or change another's data. Role checks protect admin routes.
- **App scopes:** enforced on the server for REST tokens *and* for embedded-app SDK calls.
- **Signatures:** HMAC signatures on webhooks, app action calls and channel outbound webhooks.
- **SSRF guard:** in production, user-supplied URLs can't target loopback, private or link-local addresses, and redirects aren't followed.
- **Rate limits:** on sign-up, the public API, catch hooks, chat start/messages and inbound channels.
- **Safe embedding:** sandboxed iframes for embedded apps. The website widget runs in its own origin-isolated iframe.

## Deployment

**Docker**

```bash
docker build -t orbitcrm .
docker run -p 3001:3001 -e MONGODB_URI=… -e NEXTAUTH_SECRET=… -e NEXTAUTH_URL=https://crm.example.com orbitcrm
```

**Render (free tier), one click:** Dashboard → **New → Blueprint** → select this repo. `render.yaml` sets up a Docker web service with a health check at `/api/health` and an auto-generated `NEXTAUTH_SECRET`, and asks you for:
- `MONGODB_URI`: a free MongoDB Atlas M0 cluster works. Allow `0.0.0.0/0` in Atlas Network Access.
- `ADMIN_EMAILS`: your email, so you can review marketplace apps.

`NEXTAUTH_URL` defaults to Render's public URL. The image uses Next.js **standalone output**: a minimal server bundle that builds in about 2 minutes and starts in under 100 ms, which helps with the free tier's cold starts.

## Project structure

```
src/app/                 landing, auth, onboarding, join/[code]
src/app/app/             home · my-work · inbox · boards/[id] · automations · marketplace · apps · settings
src/app/developer/       developer portal · app editor · docs
src/app/admin/apps       marketplace review queue
src/app/oauth/authorize  OAuth consent screen
src/app/widget.js        live-chat loader script     src/app/chat/[token]  chat window
src/app/demo-apps/       bundled reference apps (plain HTML + SDK)
src/app/api/             internal API · v1/ (tokens) · public/ (chat, inbound) · hooks/ · oauth/
src/components/board/    table · kanban · calendar · cells · relation picker · filters · drawer · import
src/components/          Inbox · Channels · Automations · Settings · CommandPalette · AppFrame · Dialer …
src/lib/                 models · items · events · automation · inbox · filters · publicApi · outbound · auth
public/sdk/              App SDK
```

## Roadmap

- Realtime updates over WebSockets (the inbox and boards currently poll)
- Email open and click tracking, and email templates
- Dashboards with custom widgets
- Field-level permissions and private boards
- AI assistant: summarise conversations, draft replies, score leads

---

Built with ❤️ by [Aman Jha](https://amanjhacodes55.github.io).

## License

OrbitCRM is free and open-source software, licensed under the **GNU Affero General Public License v3.0 or later** ([AGPL-3.0-or-later](LICENSE)).

You can use, study, share and modify it for any purpose, including commercially. If you distribute a modified version, **or run one as a service that others use over a network**, you must publish your changes under the same license so the community benefits too.

Copyright © 2026 Aman Jha
