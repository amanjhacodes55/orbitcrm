export const metadata = { title: "Developer docs" };

const origin = process.env.NEXTAUTH_URL || "http://localhost:3001";

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-lg border border-border bg-[#1f2240] p-4 text-[13px] leading-relaxed text-[#e6e8f5]"><code>{children}</code></pre>;
}
function H({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="scroll-mt-20 pt-6 text-xl font-bold">{children}</h2>;
}

const TOC = [["overview", "Overview"], ["auth", "Authentication"], ["oauth", "OAuth install flow"], ["rest", "REST API"], ["webhooks", "Webhooks"], ["sdk", "App SDK (embedded UI)"], ["dialer", "Building a dialer"], ["actions", "Automation actions"], ["triggers", "Automation triggers"], ["catch", "Catch hooks"], ["channels", "Channels & live chat"], ["review", "Review & publishing"]];

export default function Docs() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[220px_1fr]">
      <nav className="sticky top-20 hidden h-fit space-y-1 text-sm lg:block">
        {TOC.map(([id, l]) => <a key={id} href={`#${id}`} className="block rounded px-2 py-1 text-muted hover:bg-surface-2 hover:text-text">{l}</a>)}
      </nav>
      <article className="min-w-0 space-y-4 text-[15px] leading-relaxed">
        <h1 className="text-3xl font-extrabold">OrbitCRM developer documentation</h1>
        <H id="overview">Overview</H>
        <p>An OrbitCRM <b>app</b> can do any combination of:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li><b>Embedded UI</b> — a dialer, a settings page and an item side-panel, rendered in iframes and talking to the CRM through the App SDK.</li>
          <li><b>REST API</b> — read/write boards and items, log calls and notes, subscribe to webhooks — using an installation token.</li>
          <li><b>Automation triggers & actions</b> — appear in every workspace&apos;s automation builder once installed.</li>
        </ul>
        <p>Create apps in the <a className="text-brand" href="/developer">developer portal</a>. Drafts can be installed in your own workspace for testing; submit for review to list it in the Marketplace.</p>

        <H id="auth">Authentication</H>
        <p>All REST calls use a bearer token:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li><code>orb_inst_…</code> — <b>installation token</b>, issued when a workspace installs your app. Limited to the scopes you requested.</li>
          <li><code>orb_key_…</code> — <b>workspace API key</b> created by an admin in Settings → API keys (full access, for internal scripts).</li>
        </ul>
        <Code>{`curl ${origin}/api/v1/me -H "Authorization: Bearer orb_inst_xxx"`}</Code>
        <p>Rate limit: 300 requests / minute / token. Errors are JSON: <code>{"{ \"error\": \"…\" }"}</code>.</p>

        <H id="oauth">OAuth install flow</H>
        <p>If your app has a backend, add a redirect URL. Link users to:</p>
        <Code>{`${origin}/oauth/authorize?client_id=orb_client_xxx&redirect_uri=https://yourapp.com/callback&state=RANDOM`}</Code>
        <p>The user picks a workspace and approves your scopes; we redirect to <code>redirect_uri?code=…&state=…</code>. Exchange the code (valid 10 minutes, single use):</p>
        <Code>{`curl -X POST ${origin}/api/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{"grant_type":"authorization_code","code":"orb_code_xxx","client_id":"orb_client_xxx","client_secret":"orb_secret_xxx"}'

→ { "access_token": "orb_inst_xxx", "token_type": "Bearer", "installation_id": "…", "scope": "items.read items.write" }`}</Code>

        <H id="rest">REST API</H>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left"><tr><th className="p-2">Method & path</th><th className="p-2">Scope</th><th className="p-2">Description</th></tr></thead>
            <tbody className="[&_td]:border-t [&_td]:border-border [&_td]:p-2">
              {[["GET /api/v1/me", "—", "Workspace, scopes and app of the token"], ["GET /api/v1/boards", "boards.read", "Boards with columns (id, title, type, options) and groups"], ["GET /api/v1/boards/:id", "boards.read", "One board"], ["GET /api/v1/boards/:id/items", "items.read", "List items. ?limit, ?cursor, ?search, ?field=Email&value=a@b.com"], ["POST /api/v1/boards/:id/items", "items.write", "Create: { name, group?, values: { \"Status\": \"New\", \"Email\": \"…\" } }"], ["GET /api/v1/items/:id", "items.read", "One item"], ["PATCH /api/v1/items/:id", "items.write", "Update: { name?, group?, values? }"], ["DELETE /api/v1/items/:id", "items.write", "Delete"], ["POST /api/v1/items/:id/activities", "activities.write", "Log { type: call|note|email, text, data: { direction, outcome, durationSec, phone, recordingUrl } }"], ["POST /api/v1/triggers/:key", "triggers.fire", "Fire your trigger: { item_id?, board_id?, data }"], ["GET/POST /api/v1/webhooks", "webhooks.write", "List / subscribe { url, events, board_id? }"], ["DELETE /api/v1/webhooks/:id", "webhooks.write", "Unsubscribe"]].map((r) => <tr key={r[0]}><td><code>{r[0]}</code></td><td><code>{r[1]}</code></td><td>{r[2]}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p><b>Values</b> can be keyed by column id or column <b>title</b>. Status/dropdown accept the label (<code>&quot;Qualified&quot;</code>), dates accept anything parseable, numbers strip <code>₹ , $</code>. Responses include <code>fields</code> keyed by column title with readable values.</p>
        <Code>{`curl -X POST ${origin}/api/v1/boards/BOARD_ID/items \\
  -H "Authorization: Bearer orb_inst_xxx" -H "Content-Type: application/json" \\
  -d '{"name":"Neha Rao","values":{"Status":"New","Email":"neha@acme.io","Phone":"+91 90000 11111"}}'`}</Code>

        <H id="webhooks">Webhooks</H>
        <p>Events: <code>item.created</code>, <code>item.updated</code>, <code>item.deleted</code>, <code>activity.created</code>. Each delivery is a POST:</p>
        <Code>{`X-Orbit-Event: item.updated
X-Orbit-Signature: sha256=<hex HMAC-SHA256 of the raw body using the webhook secret>

{
  "event": "item.updated",
  "occurred_at": "2026-10-18T10:00:00.000Z",
  "workspace_id": "…",
  "board": { "id": "…", "name": "Leads" },
  "item": { "id": "…", "name": "Priya Sharma", "fields": { "Status": "Qualified", "Email": "…" }, "values": { … } },
  "changes": [ { "column": "c1", "title": "Status", "from": "opt_new", "to": "opt_qualified" } ]
}`}</Code>
        <Code>{`// Node.js verification
import crypto from "node:crypto";
const expected = "sha256=" + crypto.createHmac("sha256", process.env.ORBIT_WEBHOOK_SECRET).update(rawBody).digest("hex");
if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers["x-orbit-signature"]))) return res.status(401).end();`}</Code>
        <p>Respond 2xx within 8 s. After 20 consecutive failures the webhook is disabled.</p>

        <H id="sdk">App SDK (embedded UI)</H>
        <p>Your dialer / settings / item-panel pages are loaded in an iframe with <code>?installation=…&surface=…</code>. Include the SDK:</p>
        <Code>{`<script src="${origin}/sdk/orbit-app-sdk.js"></script>
<script>
  const ctx = await Orbit.init();     // { user, workspace, installationId, surface, item?, phone? }
  const item = await Orbit.items.get(ctx.item.id);           // needs items.read
  await Orbit.items.update(ctx.item.id, { "Status": "Contacted" });  // items.write
  await Orbit.activities.log({ itemId: ctx.item.id, type: "note", text: "Hello" }); // activities.write
  const s = await Orbit.settings.get(); await Orbit.settings.save({ apiKey: "…" });
  Orbit.ui.toast("Saved!"); Orbit.ui.resize(600); Orbit.ui.close();
</script>`}</Code>
        <p>Every call is checked server-side against your installation&apos;s scopes and the signed-in user&apos;s workspace.</p>

        <H id="dialer">Building a dialer</H>
        <p>Set the <b>Dialer URL</b>. When a user clicks a phone number anywhere in the CRM, your page receives a <code>dial</code> event:</p>
        <Code>{`Orbit.on("dial", async ({ phone, item }) => {
  startCall(phone);                   // your telephony (Twilio, Exotel, SIP.js…)
  const seconds = await waitForHangup();
  await Orbit.activities.log({ itemId: item.id, type: "call", direction: "outbound",
    outcome: "Connected", durationSec: seconds, phone, text: notes });
  await Orbit.triggers.fire("call_ended", { outcome: "Connected", duration: seconds }, item.id);
});`}</Code>
        <p>See the open-source reference implementation: the <b>Softphone</b> app (<code>/demo-apps/softphone</code>).</p>

        <H id="actions">Automation actions</H>
        <p>Declare actions with an endpoint URL and input fields. When an automation runs, we POST (signed with your app&apos;s <b>signing secret</b>):</p>
        <Code>{`{ "action": "score_lead", "inputs": { "email": "cto@bigcorp.ai" }, "item": { … }, "workspace_id": "…", "installation_id": "…", "settings": { … } }

→ 200 { "outputs": { "score": 85, "grade": "A" } }`}</Code>
        <p>Users map output keys into columns. Reference: <b>Lead Scorer</b> (<code>/api/demo-apps/lead-scorer/score</code>).</p>

        <H id="triggers">Automation triggers</H>
        <p>Declare triggers (key + label). Users build automations “When <i>your app</i> fires <i>trigger</i>”. Fire it from your backend with the installation token, or from an embedded page with <code>Orbit.triggers.fire</code>:</p>
        <Code>{`curl -X POST ${origin}/api/v1/triggers/payment_received \\
  -H "Authorization: Bearer orb_inst_xxx" -H "Content-Type: application/json" \\
  -d '{"item_id":"…","data":{"amount":4999,"currency":"INR"}}'`}</Code>
        <p>The <code>data</code> object is available in the automation as <code>{"{{payload.amount}}"}</code>.</p>

        <H id="catch">Catch hooks</H>
        <p>Any automation can use the <b>catch hook</b> trigger. It gets a secret URL; POST JSON (or form data) to it from website forms, Zapier, Make or any backend. Fields are available as <code>{"{{payload.*}}"}</code>. Include <code>item_id</code> to act on an existing item.</p>

        <H id="channels">Channels & live chat</H>
        <p>Admins add channels in <b>Settings → Channels</b>. Every inbound message lands in the <b>Inbox</b>, is matched to a lead by email/phone (or creates one), is logged on the lead&apos;s timeline and fires the <b>“When a message arrives”</b> automation trigger. The <b>“Reply to the conversation”</b> action sends auto-replies.</p>
        <p><b>Website live chat</b> — paste one tag before <code>&lt;/body&gt;</code>:</p>
        <Code>{`<script src="${origin}/widget.js" data-channel="ch_xxx" data-color="#6161ff" async></script>`}</Code>
        <p><b>Email / SMS / WhatsApp / custom</b> — point your provider at the channel&apos;s inbound URL. It accepts our JSON, Twilio form posts (<code>From</code>, <code>Body</code>, <code>ProfileName</code>) and email-parse webhooks (<code>from</code>, <code>subject</code>, <code>text</code> / <code>stripped-text</code> / <code>TextBody</code>):</p>
        <Code>{`curl -X POST ${origin}/api/public/inbound/ch_xxx \
  -H "Content-Type: application/json" \
  -d '{"from":"+919811122233","name":"Arnav","text":"Price for 10 users?"}'

→ { "ok": true, "conversation_id": "…", "new_conversation": true, "lead_id": "…" }`}</Code>
        <p><b>Replies</b>: live chat is delivered to the widget instantly; email via <code>SMTP_URL</code>; SMS/WhatsApp via the channel&apos;s Twilio credentials, or POSTed (signed with <code>X-Orbit-Signature</code>) to the channel&apos;s outbound webhook:</p>
        <Code>{`{ "event": "message.outbound", "channel": { "id": "…", "type": "whatsapp", "name": "WhatsApp" },
  "conversation_id": "…", "to": { "name": "Arnav", "phone": "+919811122233" }, "text": "₹999/user" }`}</Code>

        <H id="review">Review & publishing</H>
        <ul className="list-disc space-y-1 pl-6">
          <li>Automated checks: tagline, description ≥ 80 chars, support email, at least one capability and scope, action URLs present, dialers request <code>activities.write</code>, trigger apps request <code>triggers.fire</code>, unique keys.</li>
          <li>Then an OrbitCRM admin reviews and approves or rejects with notes. You get a notification.</li>
          <li>Changing scopes of an approved app sends it back to review.</li>
        </ul>
      </article>
    </div>
  );
}
