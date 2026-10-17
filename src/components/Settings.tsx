"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Copy, KeyRound, Plus, RefreshCw, Send, Trash2, Users, Webhook, Building2, MessagesSquare, Palette } from "lucide-react";
import Channels from "@/components/Channels";
import { ThemeGrid } from "@/components/ThemePicker";
import Orbi from "@/components/art/Orbi";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { Avatar, Modal, Switch, timeAgo } from "@/components/ui";
import type { Ctx } from "@/lib/context";

type Member = { id: string; name: string; email: string; image: string; role: string };
type Hook = { _id: string; url: string; events: string[]; active: boolean; secret: string; lastStatus?: number; lastDeliveryAt?: string; failures: number; installation?: { app: string } | null; board?: string };
type Key = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt?: string };
const EVENTS = ["item.created", "item.updated", "item.deleted", "activity.created"];

export default function Settings({ ctx, boards, origin }: { ctx: Ctx; boards: { id: string; name: string; icon: string }[]; origin: string }) {
  const [tab, setTab] = useState<"general" | "appearance" | "members" | "channels" | "api" | "webhooks">("general");
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("tab"); if (t === "channels" || t === "api" || t === "webhooks" || t === "members" || t === "appearance") setTab(t); }, []);
  const admin = ctx.workspace.role !== "member";
  const tabs = [["general", "General", Building2], ["appearance", "Appearance", Palette], ["members", "Members", Users], ["channels", "Channels", MessagesSquare], ["api", "API keys", KeyRound], ["webhooks", "Webhooks", Webhook]] as const;
  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)} className={clsx("relative flex items-center gap-1.5 px-3 py-2.5 text-sm", tab === k ? "font-semibold" : "text-muted")}>
            <I className="size-4" /> {l}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand" />}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "general" && <General ctx={ctx} admin={admin} />}
        {tab === "appearance" && (
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-4"><Orbi pose="celebrate" size={90} /><div><p className="font-display text-lg font-bold">Theme</p><p className="text-sm text-muted">Personal to you and saved to your account — your teammates keep their own vibe.</p></div></div>
            <ThemeGrid />
          </div>
        )}
        {tab === "members" && <Members ctx={ctx} admin={admin} origin={origin} />}
        {tab === "channels" && (admin ? <Channels boards={boards} origin={origin} /> : <p className="text-sm text-muted">Only workspace admins can manage channels.</p>)}
        {tab === "api" && (admin ? <ApiKeys origin={origin} /> : <p className="text-sm text-muted">Only workspace admins can manage API keys.</p>)}
        {tab === "webhooks" && (admin ? <Webhooks boards={boards} /> : <p className="text-sm text-muted">Only workspace admins can manage webhooks.</p>)}
      </div>
    </div>
  );
}

function General({ ctx, admin }: { ctx: Ctx; admin: boolean }) {
  const [name, setName] = useState(ctx.workspace.name);
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="card max-w-lg space-y-4 p-6">
      <div><label className="label">Workspace name</label><input className="input" value={name} disabled={!admin} onChange={(e) => setName(e.target.value)} /></div>
      <p className="text-xs text-muted">Workspace ID: <code>{ctx.workspace.id}</code> · your role: <b>{ctx.workspace.role}</b></p>
      {admin && <button className="btn btn-primary" onClick={async () => { const r = await api("/api/workspaces", { method: "PATCH", json: { name } }); if (!r.ok) return toast(r.error, "error"); toast("Saved", "success"); router.refresh(); }}>Save</button>}
    </div>
  );
}

function Members({ ctx, admin, origin }: { ctx: Ctx; admin: boolean; origin: string }) {
  const toast = useToast();
  const [data, setData] = useState<{ members: Member[]; inviteCode: string | null } | null>(null);
  const load = useCallback(async () => { const r = await api<{ members: Member[]; inviteCode: string | null }>("/api/workspaces/members"); if (r.ok) setData(r.data); }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (body: Record<string, unknown>) => { const r = await api("/api/workspaces/members", { method: "POST", json: body }); if (!r.ok) toast(r.error, "error"); load(); };
  const link = data?.inviteCode ? `${origin}/join/${data.inviteCode}` : "";
  return (
    <div className="space-y-5">
      {admin && data?.inviteCode && (
        <div className="card p-5">
          <p className="font-semibold">Invite teammates</p>
          <p className="text-sm text-muted">Anyone with this link can join as a member.</p>
          <div className="mt-3 flex gap-2">
            <input className="input font-mono text-xs" readOnly value={link} />
            <button className="btn btn-secondary" onClick={() => { navigator.clipboard.writeText(link); toast("Invite link copied", "success"); }}><Copy className="size-4" /> Copy</button>
            <button className="btn btn-ghost" onClick={() => act({ action: "reset_invite" })} title="Reset link"><RefreshCw className="size-4" /></button>
          </div>
        </div>
      )}
      <div className="card divide-y divide-border">
        {data?.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-4">
            <Avatar name={m.name} image={m.image} size={34} />
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{m.name}{m.id === ctx.user.id && " (you)"}</p><p className="truncate text-xs text-muted">{m.email}</p></div>
            {admin && m.role !== "owner" && m.id !== ctx.user.id ? (
              <>
                <select className="input !w-auto !py-1" value={m.role} onChange={(e) => act({ action: "role", user: m.id, role: e.target.value })}><option value="member">Member</option><option value="admin">Admin</option></select>
                <button className="btn btn-ghost btn-sm hover:!text-danger" onClick={() => confirm(`Remove ${m.name}?`) && act({ action: "remove", user: m.id })}><Trash2 className="size-3.5" /></button>
              </>
            ) : <span className="chip capitalize">{m.role}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiKeys({ origin }: { origin: string }) {
  const toast = useToast();
  const [keys, setKeys] = useState<Key[]>([]);
  const [name, setName] = useState("");
  const [created, setCreated] = useState("");
  const load = useCallback(async () => { const r = await api<{ keys: Key[] }>("/api/apikeys"); if (r.ok) setKeys(r.data.keys); }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="font-semibold">Create an API key</p>
        <p className="text-sm text-muted">Full access to this workspace through the REST API. Keep it secret.</p>
        <div className="mt-3 flex gap-2">
          <input className="input" placeholder="e.g. Website backend" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-primary" disabled={!name.trim()} onClick={async () => { const r = await api<{ key: string }>("/api/apikeys", { method: "POST", json: { name } }); if (!r.ok) return toast(r.error, "error"); setCreated(r.data.key); setName(""); load(); }}><Plus className="size-4" /> Create</button>
        </div>
      </div>
      <div className="card divide-y divide-border">
        {keys.length === 0 && <p className="p-5 text-sm text-muted">No API keys yet.</p>}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 p-4 text-sm">
            <KeyRound className="size-4 text-muted" />
            <div className="min-w-0 flex-1"><p className="font-semibold">{k.name}</p><p className="text-xs text-muted"><code>{k.prefix}…</code> · created {timeAgo(k.createdAt)} · {k.lastUsedAt ? `used ${timeAgo(k.lastUsedAt)}` : "never used"}</p></div>
            <button className="btn btn-ghost btn-sm hover:!text-danger" onClick={async () => { if (!confirm("Revoke this key? Apps using it stop working.")) return; await api(`/api/apikeys/${k.id}`, { method: "DELETE" }); load(); }}>Revoke</button>
          </div>
        ))}
      </div>
      <Modal open={!!created} onClose={() => setCreated("")} title="Your new API key">
        <p className="text-sm text-muted">Copy it now — it won&apos;t be shown again.</p>
        <div className="mt-3 flex gap-2"><input readOnly className="input font-mono text-xs" value={created} /><button className="btn btn-secondary" onClick={() => { navigator.clipboard.writeText(created); toast("Copied", "success"); }}><Copy className="size-4" /></button></div>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs">{`curl ${origin}/api/v1/boards \\\n  -H "Authorization: Bearer ${created.slice(0, 16)}…"`}</pre>
      </Modal>
    </div>
  );
}

function Webhooks({ boards }: { boards: { id: string; name: string; icon: string }[] }) {
  const toast = useToast();
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [f, setF] = useState({ url: "", events: ["item.created", "item.updated"], board: "" });
  const [logs, setLogs] = useState<{ hook: Hook; rows: { _id: string; event: string; status: number; ok: boolean; durationMs: number; error?: string; createdAt: string }[] } | null>(null);
  const load = useCallback(async () => { const r = await api<{ webhooks: Hook[] }>("/api/webhooks"); if (r.ok) setHooks(r.data.webhooks); }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-5">
        <p className="font-semibold">Add a webhook</p>
        <p className="text-sm text-muted">We POST a JSON payload to your URL when events happen, signed with <code>X-Orbit-Signature: sha256=HMAC(secret, body)</code>.</p>
        <input className="input" placeholder="https://your-server.com/orbit-webhook" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        <div className="flex flex-wrap gap-3 text-sm">
          {EVENTS.map((e) => <label key={e} className="flex items-center gap-1.5"><input type="checkbox" className="accent-[var(--brand)]" checked={f.events.includes(e)} onChange={(x) => setF({ ...f, events: x.target.checked ? [...f.events, e] : f.events.filter((y) => y !== e) })} /> <code>{e}</code></label>)}
        </div>
        <div className="flex gap-2">
          <select className="input !w-auto" value={f.board} onChange={(e) => setF({ ...f, board: e.target.value })}><option value="">All boards</option>{boards.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}</select>
          <button className="btn btn-primary" onClick={async () => { const r = await api("/api/webhooks", { method: "POST", json: f }); if (!r.ok) return toast(r.error, "error"); setF({ ...f, url: "" }); load(); }}><Plus className="size-4" /> Add webhook</button>
        </div>
      </div>
      <div className="space-y-3">
        {hooks.map((h) => (
          <div key={h._id} className="card p-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Switch checked={h.active} onChange={async () => { await api(`/api/webhooks/${h._id}`, { method: "POST", json: { action: "toggle" } }); load(); }} label="Active" />
              <code className="min-w-0 flex-1 truncate">{h.url}</code>
              {h.installation && <span className="chip">created by an app</span>}
              <button className="btn btn-ghost btn-sm" onClick={async () => { const r = await api<{ status: number; error: string }>(`/api/webhooks/${h._id}`, { method: "POST", json: { action: "ping" } }); toast(r.data.status ? `Ping → HTTP ${r.data.status}` : `Ping failed: ${r.data.error || r.error}`, r.data.status >= 200 && r.data.status < 300 ? "success" : "error"); load(); }}><Send className="size-3.5" /> Ping</button>
              <button className="btn btn-ghost btn-sm" onClick={async () => { const r = await api<{ deliveries: [] }>(`/api/webhooks/${h._id}`); setLogs({ hook: h, rows: r.data.deliveries || [] }); }}>Deliveries</button>
              <button className="btn btn-ghost btn-sm hover:!text-danger" onClick={async () => { if (!confirm("Delete webhook?")) return; await api(`/api/webhooks/${h._id}`, { method: "DELETE" }); load(); }}><Trash2 className="size-3.5" /></button>
            </div>
            <p className="mt-2 text-xs text-muted">{h.events.join(", ")} · secret <code>{h.secret.slice(0, 12)}…</code> <button className="text-brand" onClick={() => { navigator.clipboard.writeText(h.secret); toast("Secret copied", "success"); }}>copy</button> · {h.lastDeliveryAt ? `last delivery ${timeAgo(h.lastDeliveryAt)} (HTTP ${h.lastStatus || "error"})` : "no deliveries yet"}{h.failures > 0 && <span className="text-danger"> · {h.failures} consecutive failures</span>}</p>
          </div>
        ))}
      </div>
      <Modal open={!!logs} onClose={() => setLogs(null)} title="Recent deliveries (7 days)" wide>
        {logs?.rows.length === 0 && <p className="text-sm text-muted">No deliveries yet.</p>}
        <div className="space-y-1">{logs?.rows.map((d) => <div key={d._id} className="flex items-center gap-3 rounded px-2 py-1.5 text-sm odd:bg-surface-2"><span className={d.ok ? "text-success" : "text-danger"}>{d.ok ? "✓" : "✗"}</span><code>{d.event}</code><span>HTTP {d.status || "—"}</span><span className="text-muted">{d.durationMs} ms</span><span className="truncate text-danger">{d.error}</span><span className="ml-auto text-xs text-faint">{timeAgo(d.createdAt)}</span></div>)}</div>
      </Modal>
    </div>
  );
}
