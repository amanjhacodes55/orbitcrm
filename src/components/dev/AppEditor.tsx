"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CheckCircle2, Copy, Eye, KeyRound, Plus, Save, Send, Trash2, XCircle, ExternalLink } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";

type Field = { key: string; label: string; type: string; required: boolean };
type AppT = {
  _id: string; name: string; slug: string; tagline: string; description: string; category: string; icon: string; website: string; supportEmail: string;
  scopes: string[]; clientId: string; signingSecret?: string; redirectUrls: string[];
  features: { settingsUrl: string; dialerUrl: string; itemPanelUrl: string };
  triggers: { key: string; label: string; description: string; fields: Field[] }[];
  actions: { key: string; label: string; description: string; url: string; fields: Field[] }[];
  status: string; reviewNotes: string; installs: number;
};
type Review = { checks: { name: string; ok: boolean }[]; ok: boolean };
const CATS = ["Telephony", "Productivity", "Marketing", "Sales", "Data enrichment", "Communication", "Other"];

export default function AppEditor({ initial, review: r0, scopes, origin }: { initial: AppT; review: Review; scopes: Record<string, string>; origin: string }) {
  const router = useRouter();
  const toast = useToast();
  const [a, setA] = useState<AppT>(initial);
  const [review, setReview] = useState(r0);
  const [tab, setTab] = useState<"listing" | "auth" | "features" | "automation" | "publish">("listing");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState("");
  const [showSign, setShowSign] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    try {
      const s = sessionStorage.getItem(`orbit-secret:${initial._id}`);
      if (s) { setSecret(s); sessionStorage.removeItem(`orbit-secret:${initial._id}`); }
    } catch {}
  }, [initial._id]);
  const set = (p: Partial<AppT>) => { setA({ ...a, ...p }); setDirty(true); };

  async function save() {
    setBusy(true);
    const { name, tagline, description, category, icon, website, supportEmail, scopes: sc, redirectUrls, features, triggers, actions } = a;
    const r = await api<{ app: AppT; review: Review }>(`/api/dev/apps/${a._id}`, { method: "PUT", json: { name, tagline, description, category, icon, website, supportEmail, scopes: sc, redirectUrls: redirectUrls.filter(Boolean), features, triggers, actions } });
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    setA({ ...r.data.app, signingSecret: a.signingSecret });
    setReview(r.data.review);
    setDirty(false);
    toast("Saved", "success");
  }
  async function submit() {
    if (dirty) await save();
    const r = await api<{ status: string }>(`/api/dev/apps/${a._id}/submit`, { method: "POST" });
    if (!r.ok) return toast(r.error, "error");
    setA({ ...a, status: r.data.status });
    toast("Submitted for review 🎉", "success");
  }
  async function rotate() {
    if (!confirm("Generate a new client secret? The old one stops working immediately.")) return;
    const r = await api<{ clientSecret: string }>(`/api/dev/apps/${a._id}/secret`, { method: "POST" });
    if (r.ok) setSecret(r.data.clientSecret);
  }
  async function del() {
    if (!confirm(`Delete ${a.name}? It is uninstalled from every workspace.`)) return;
    await api(`/api/dev/apps/${a._id}`, { method: "DELETE" });
    router.push("/developer");
  }
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast("Copied", "success"); };

  const fieldsEditor = (fields: Field[], onChange: (f: Field[]) => void) => (
    <div className="space-y-1.5">
      {fields.map((f, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_110px_auto_auto] items-center gap-2">
          <input className="input !py-1 font-mono text-xs" placeholder="key" value={f.key} onChange={(e) => onChange(fields.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
          <input className="input !py-1 text-xs" placeholder="Label" value={f.label} onChange={(e) => onChange(fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <select className="input !py-1 text-xs" value={f.type} onChange={(e) => onChange(fields.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}>{["text", "number", "email", "phone", "textarea"].map((t) => <option key={t}>{t}</option>)}</select>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={f.required} onChange={(e) => onChange(fields.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)))} /> req</label>
          <button className="text-faint hover:text-danger" onClick={() => onChange(fields.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => onChange([...fields, { key: "", label: "", type: "text", required: false }])}><Plus className="size-3.5" /> Input field</button>
    </div>
  );

  const tabs = [["listing", "Listing"], ["auth", "Auth & scopes"], ["features", "Surfaces (UI)"], ["automation", "Triggers & actions"], ["publish", "Publish"]] as const;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-4xl">{a.icon}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{a.name}</h1>
          <p className="text-sm text-muted">Status: <b className="capitalize">{a.status.replace("_", " ")}</b> · {a.installs} installs · slug <code>{a.slug}</code></p>
        </div>
        <Link href={`/app/marketplace/${a.slug}`} className="btn btn-secondary btn-sm"><Eye className="size-3.5" /> Preview & test install</Link>
        <button className="btn btn-primary btn-sm" disabled={busy || !dirty} onClick={save}><Save className="size-3.5" /> {dirty ? "Save changes" : "Saved"}</button>
      </div>
      {a.status === "rejected" && a.reviewNotes && <p className="mt-4 rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger"><b>Reviewer:</b> {a.reviewNotes}</p>}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={clsx("relative px-3 py-2.5 text-sm", tab === k ? "font-semibold" : "text-muted")}>{l}{tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand" />}</button>
        ))}
      </div>

      <div className="mt-6 space-y-5">
        {tab === "listing" && (
          <div className="card grid gap-4 p-6 sm:grid-cols-2">
            <div className="flex gap-3 sm:col-span-2">
              <div><label className="label">Icon</label><input className="input !w-16 text-center text-xl" maxLength={4} value={a.icon} onChange={(e) => set({ icon: e.target.value })} /></div>
              <div className="flex-1"><label className="label">Name</label><input className="input" value={a.name} onChange={(e) => set({ name: e.target.value })} /></div>
            </div>
            <div className="sm:col-span-2"><label className="label">Tagline</label><input className="input" maxLength={120} value={a.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="One line that explains the value" /></div>
            <div className="sm:col-span-2"><label className="label">Description ({a.description.length}/5000)</label><textarea className="input min-h-36" value={a.description} onChange={(e) => set({ description: e.target.value })} /></div>
            <div><label className="label">Category</label><select className="input" value={a.category} onChange={(e) => set({ category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label">Support email</label><input className="input" value={a.supportEmail} onChange={(e) => set({ supportEmail: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Website</label><input className="input" value={a.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://" /></div>
          </div>
        )}

        {tab === "auth" && (
          <>
            <div className="card space-y-4 p-6">
              <h2 className="flex items-center gap-2 font-semibold"><KeyRound className="size-4" /> Credentials</h2>
              <div><label className="label">Client ID</label><div className="flex gap-2"><input readOnly className="input font-mono text-xs" value={a.clientId} /><button className="btn btn-secondary" onClick={() => copy(a.clientId)}><Copy className="size-4" /></button></div></div>
              <div>
                <label className="label">Client secret</label>
                {secret ? (
                  <><div className="flex gap-2"><input readOnly className="input font-mono text-xs" value={secret} /><button className="btn btn-secondary" onClick={() => copy(secret)}><Copy className="size-4" /></button></div><p className="mt-1 text-xs text-warn">Copy it now — it&apos;s shown only once.</p></>
                ) : <button className="btn btn-secondary btn-sm" onClick={rotate}>Generate new secret</button>}
              </div>
              <div>
                <label className="label">Signing secret (verify requests we send you)</label>
                <div className="flex gap-2"><input readOnly className="input font-mono text-xs" type={showSign ? "text" : "password"} value={a.signingSecret || ""} /><button className="btn btn-secondary" onClick={() => setShowSign(!showSign)}><Eye className="size-4" /></button><button className="btn btn-secondary" onClick={() => copy(a.signingSecret || "")}><Copy className="size-4" /></button></div>
                <p className="mt-1 text-xs text-muted">Action requests carry <code>X-Orbit-Signature: sha256=HMAC_SHA256(signingSecret, rawBody)</code>.</p>
              </div>
            </div>
            <div className="card space-y-3 p-6">
              <h2 className="font-semibold">Scopes</h2>
              {Object.entries(scopes).map(([k, v]) => (
                <label key={k} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <input type="checkbox" className="accent-[var(--brand)]" checked={a.scopes.includes(k)} onChange={(e) => set({ scopes: e.target.checked ? [...a.scopes, k] : a.scopes.filter((s) => s !== k) })} />
                  <code>{k}</code><span className="text-muted">{v}</span>
                </label>
              ))}
            </div>
            <div className="card space-y-3 p-6">
              <h2 className="font-semibold">OAuth redirect URLs (optional)</h2>
              <p className="text-sm text-muted">If your app has its own backend, users are sent to your redirect URL with <code>?code=…&state=…</code> after installing. Exchange the code at <code>POST {origin}/api/oauth/token</code> for an access token.</p>
              {a.redirectUrls.map((u, i) => (
                <div key={i} className="flex gap-2"><input className="input" value={u} onChange={(e) => set({ redirectUrls: a.redirectUrls.map((x, j) => (j === i ? e.target.value : x)) })} placeholder="https://yourapp.com/oauth/callback" /><button className="btn btn-ghost" onClick={() => set({ redirectUrls: a.redirectUrls.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></button></div>
              ))}
              {a.redirectUrls.length < 5 && <button className="btn btn-secondary btn-sm" onClick={() => set({ redirectUrls: [...a.redirectUrls, ""] })}><Plus className="size-3.5" /> Add redirect URL</button>}
              <p className="text-xs text-muted">Install link for your website: <code>{origin}/oauth/authorize?client_id={a.clientId}&redirect_uri=…&state=…</code></p>
            </div>
          </>
        )}

        {tab === "features" && (
          <div className="card space-y-5 p-6">
            <p className="text-sm text-muted">Pages you host that OrbitCRM embeds in an iframe. Include <code>{origin}/sdk/orbit-app-sdk.js</code> and call <code>Orbit.init()</code> to talk to the CRM.</p>
            {([["dialerUrl", "📞 Dialer (calling extension)", "Opens when a user clicks a phone number. Listen for Orbit.on('dial', …) and log calls with Orbit.activities.log(…). Requires activities.write."], ["settingsUrl", "⚙️ Settings page", "Shown in Installed apps. Read/save per-workspace settings with Orbit.settings.get()/save()."], ["itemPanelUrl", "🧩 Item panel", "Shown in the Apps tab of every item. Orbit.context().item gives you the item; Orbit.items.get(id) loads its fields."]] as const).map(([k, l, d]) => (
              <div key={k}>
                <label className="label">{l}</label>
                <input className="input" value={a.features[k]} onChange={(e) => set({ features: { ...a.features, [k]: e.target.value } })} placeholder="https://yourapp.com/orbit/…" />
                <p className="mt-1 text-xs text-muted">{d}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "automation" && (
          <>
            <div className="card space-y-4 p-6">
              <div className="flex items-center justify-between"><h2 className="font-semibold">⚡ Triggers</h2><button className="btn btn-secondary btn-sm" onClick={() => set({ triggers: [...a.triggers, { key: "", label: "", description: "", fields: [] }] })}><Plus className="size-3.5" /> Trigger</button></div>
              <p className="text-sm text-muted">Users pick these in “When an app fires a trigger”. Fire them with <code>POST /api/v1/triggers/&lt;key&gt;</code> (installation token) or <code>Orbit.triggers.fire(key, data)</code> from an embedded page.</p>
              {a.triggers.map((t, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                    <input className="input font-mono text-xs" placeholder="key (call_ended)" value={t.key} onChange={(e) => set({ triggers: a.triggers.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)) })} />
                    <input className="input" placeholder="Label (Call ended)" value={t.label} onChange={(e) => set({ triggers: a.triggers.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <button className="btn btn-ghost" onClick={() => set({ triggers: a.triggers.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></button>
                  </div>
                  <input className="input" placeholder="Description" value={t.description} onChange={(e) => set({ triggers: a.triggers.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
                  <p className="text-xs font-semibold text-muted">Payload fields (documentation for users)</p>
                  {fieldsEditor(t.fields, (fields) => set({ triggers: a.triggers.map((x, j) => (j === i ? { ...x, fields } : x)) }))}
                </div>
              ))}
            </div>
            <div className="card space-y-4 p-6">
              <div className="flex items-center justify-between"><h2 className="font-semibold">▶ Actions</h2><button className="btn btn-secondary btn-sm" onClick={() => set({ actions: [...a.actions, { key: "", label: "", description: "", url: "", fields: [] }] })}><Plus className="size-3.5" /> Action</button></div>
              <p className="text-sm text-muted">Users add these as steps in automations. We POST <code>{"{ action, inputs, item, workspace_id, installation_id, settings }"}</code> to your URL (signed). Respond with <code>{"{ outputs: { … } }"}</code>; users can map outputs into columns.</p>
              {a.actions.map((t, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                    <input className="input font-mono text-xs" placeholder="key (send_sms)" value={t.key} onChange={(e) => set({ actions: a.actions.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)) })} />
                    <input className="input" placeholder="Label (Send SMS)" value={t.label} onChange={(e) => set({ actions: a.actions.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <button className="btn btn-ghost" onClick={() => set({ actions: a.actions.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></button>
                  </div>
                  <input className="input" placeholder="Endpoint URL https://yourapp.com/orbit/actions/send-sms" value={t.url} onChange={(e) => set({ actions: a.actions.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                  <input className="input" placeholder="Description" value={t.description} onChange={(e) => set({ actions: a.actions.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
                  <p className="text-xs font-semibold text-muted">Input fields</p>
                  {fieldsEditor(t.fields, (fields) => set({ actions: a.actions.map((x, j) => (j === i ? { ...x, fields } : x)) }))}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "publish" && (
          <div className="card space-y-5 p-6">
            <div>
              <h2 className="font-semibold">Listing checks</h2>
              <p className="text-sm text-muted">These must all pass before you can submit. Save to re-check.</p>
              <ul className="mt-3 space-y-1.5">{review.checks.map((c) => <li key={c.name} className="flex items-center gap-2 text-sm">{c.ok ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-danger" />}{c.name}</li>)}</ul>
            </div>
            <div className="rounded-lg bg-surface-2 p-4 text-sm">
              <p className="font-semibold">Test before submitting</p>
              <p className="text-muted">Drafts can be installed in your own workspace: open <Link href={`/app/marketplace/${a.slug}`} className="text-brand">the preview listing <ExternalLink className="inline size-3" /></Link> and click Install.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {a.status === "approved" ? <p className="font-semibold text-success">✓ Live on the Marketplace</p> : a.status === "in_review" ? <p className="font-semibold text-[#579bfc]">⏳ In review — you&apos;ll get a notification when an admin decides.</p> : (
                <button className="btn btn-primary" disabled={!review.ok} onClick={submit}><Send className="size-4" /> Submit for review</button>
              )}
              <button className="btn btn-ghost ml-auto hover:!text-danger" onClick={del}><Trash2 className="size-4" /> Delete app</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
