"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ArrowDown, Copy, History, Pencil, Play, Plus, Trash2, Webhook, Workflow, Zap } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { Empty, Modal, Switch, timeAgo } from "@/components/ui";
import type { Column, Group, Member } from "@/components/board/types";

type BoardS = { _id: string; name: string; icon: string; columns: Column[]; groups: Group[] };
type AppI = { installationId: string; appId: string; name: string; icon: string; triggers: { key: string; label: string; description?: string }[]; actions: { key: string; label: string; fields: { key: string; label: string; required?: boolean }[] }[] };
type Action = { type: string; config: Record<string, unknown> };
type Auto = { _id?: string; board: string; name: string; enabled: boolean; trigger: { type: string; config: Record<string, unknown> }; conditions: { column: string; op: string; value?: unknown }[]; actions: Action[]; hookToken?: string; runCount?: number; lastRunAt?: string };
type Run = { _id: string; status: string; createdAt: string; durationMs: number; steps: { action: string; ok: boolean; detail: string }[] };

const TRIG: Record<string, string> = { item_created: "When an item is created", column_changed: "When a column changes", catch_hook: "When a webhook is received (catch hook)", app_trigger: "When an app fires a trigger", message_received: "When a message arrives in the Inbox" };
const ACT: Record<string, string> = { set_column: "Set a column value", move_to_group: "Move item to group", create_item: "Create an item", add_note: "Add a note / update", notify: "Notify someone", send_webhook: "Send a webhook (HTTP request)", app_action: "Run an app action", reply_message: "Reply to the conversation (Inbox)" };
const OPS: Record<string, string> = { equals: "is", not_equals: "is not", contains: "contains", is_empty: "is empty", not_empty: "is not empty", gt: ">", lt: "<" };

function describeTrigger(a: Auto, b: BoardS | undefined, apps: AppI[]) {
  const c = a.trigger.config;
  if (a.trigger.type === "column_changed") {
    const col = b?.columns.find((x) => x.id === c.column);
    const to = col?.options.find((o) => o.id === c.to)?.label || (c.to as string);
    return `When ${col?.title || "a column"} changes${to ? ` to ${to}` : ""}`;
  }
  if (a.trigger.type === "app_trigger") {
    const app = apps.find((x) => x.appId === c.app);
    return `When ${app?.name || "an app"} fires “${app?.triggers.find((t) => t.key === c.key)?.label || c.key}”`;
  }
  return TRIG[a.trigger.type];
}

type ChanI = { id: string; name: string };
export default function Automations({ boards, initial, apps, members, origin, channels = [] }: { boards: BoardS[]; initial: Auto[]; apps: AppI[]; members: Member[]; origin: string; channels?: ChanI[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const [autos, setAutos] = useState(initial);
  const [filter, setFilter] = useState(sp.get("board") || "");
  const [edit, setEdit] = useState<Auto | null>(null);
  const [runsOf, setRunsOf] = useState<Auto | null>(null);
  const [runs, setRuns] = useState<Run[] | null>(null);
  const list = autos.filter((a) => !filter || a.board === filter);
  const byId = (id: string) => boards.find((b) => b._id === id);

  async function toggle(a: Auto, enabled: boolean) {
    setAutos((xs) => xs.map((x) => (x._id === a._id ? { ...x, enabled } : x)));
    const r = await api(`/api/automations/${a._id}`, { method: "PATCH", json: { enabled } });
    if (!r.ok) toast(r.error, "error");
  }
  async function remove(a: Auto) {
    if (!confirm(`Delete “${a.name}”?`)) return;
    await api(`/api/automations/${a._id}`, { method: "DELETE" });
    setAutos((xs) => xs.filter((x) => x._id !== a._id));
  }
  async function openRuns(a: Auto) {
    setRunsOf(a);
    setRuns(null);
    const r = await api<{ runs: Run[] }>(`/api/automations/${a._id}/runs`);
    setRuns(r.ok ? r.data.runs : []);
  }
  async function test(a: Auto) {
    const payload = a.trigger.type === "catch_hook" ? { name: "Test lead", email: "test@example.com", phone: "+91 90000 00000", company: "Example Co", message: "Hello" } : {};
    const r = await api<{ status: string; steps: Run["steps"] }>(`/api/automations/${a._id}/test`, { method: "POST", json: { payload } });
    if (!r.ok) return toast(r.error, "error");
    toast(`Test run: ${r.data.status} — ${r.data.steps.map((s) => s.detail).join(" · ")}`, r.data.status === "failed" ? "error" : "success");
    router.refresh();
  }

  const blank = (): Auto => ({ board: filter || boards[0]?._id || "", name: "", enabled: true, trigger: { type: "column_changed", config: {} }, conditions: [], actions: [{ type: "set_column", config: {} }] });

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Workflow className="size-6 text-brand" /> Automations</h1>
          <p className="text-sm text-muted">When something happens → check conditions → run actions. Automations can chain up to 3 levels deep.</p>
        </div>
        <div className="flex gap-2">
          <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All boards</option>
            {boards.map((b) => <option key={b._id} value={b._id}>{b.icon} {b.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setEdit(blank())} disabled={!boards.length}><Plus className="size-4" /> New automation</button>
        </div>
      </div>
      {list.length === 0 && <div className="card"><Empty icon={<Zap className="size-8" />} title="No automations yet">Create one: e.g. “When Status changes to Qualified → create a deal and notify the team”.</Empty></div>}
      <div className="space-y-3">
        {list.map((a) => {
          const b = byId(a.board);
          return (
            <div key={a._id} className={clsx("card p-4", !a.enabled && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-3">
                <Switch checked={a.enabled} onChange={(v) => toggle(a, v)} label="Enabled" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-muted">{b?.icon} {b?.name} · {a.runCount || 0} runs{a.lastRunAt ? ` · last ${timeAgo(a.lastRunAt)}` : ""}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => test(a)} title="Run now"><Play className="size-3.5" /> Test</button>
                <button className="btn btn-ghost btn-sm" onClick={() => openRuns(a)}><History className="size-3.5" /> Runs</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEdit(JSON.parse(JSON.stringify(a)))}><Pencil className="size-3.5" /></button>
                <button className="btn btn-ghost btn-sm hover:!text-danger" onClick={() => remove(a)} aria-label="Delete"><Trash2 className="size-3.5" /></button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-brand-soft px-2.5 py-1 font-medium text-brand">⚡ {describeTrigger(a, b, apps)}</span>
                {a.conditions.length > 0 && <span className="rounded-md bg-warn/15 px-2.5 py-1 text-warn">if {a.conditions.length} condition{a.conditions.length > 1 ? "s" : ""}</span>}
                {a.actions.map((x, i) => <span key={i} className="rounded-md bg-surface-2 px-2.5 py-1">→ {ACT[x.type]}</span>)}
              </div>
              {a.trigger.type === "catch_hook" && a.hookToken && <HookUrl url={`${origin}/api/hooks/${a.hookToken}`} />}
            </div>
          );
        })}
      </div>
      {edit && <Builder initial={edit} boards={boards} apps={apps} members={members} channels={channels} onClose={() => setEdit(null)} onSaved={(a) => { setAutos((xs) => (xs.some((x) => x._id === a._id) ? xs.map((x) => (x._id === a._id ? a : x)) : [a, ...xs])); setEdit(null); router.refresh(); }} />}
      <Modal open={!!runsOf} onClose={() => setRunsOf(null)} title={`Run history — ${runsOf?.name}`} wide>
        {!runs ? <p className="text-sm text-muted">Loading…</p> : runs.length === 0 ? <p className="text-sm text-muted">No runs in the last 14 days.</p> : (
          <div className="space-y-2">
            {runs.map((r) => (
              <div key={r._id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className={clsx("rounded px-2 py-0.5 text-xs font-semibold text-white", r.status === "success" ? "bg-success" : r.status === "failed" ? "bg-danger" : "bg-faint")}>{r.status}</span>
                  <span className="text-muted">{timeAgo(r.createdAt)} · {r.durationMs} ms</span>
                </div>
                <ul className="mt-2 space-y-0.5 text-xs">{r.steps.map((s, i) => <li key={i} className={s.ok ? "" : "text-danger"}>{s.ok ? "✓" : "✗"} <b>{ACT[s.action] || s.action}</b>: {s.detail}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function HookUrl({ url }: { url: string }) {
  const toast = useToast();
  return (
    <div className="mt-3 rounded-lg border border-dashed border-border bg-surface-2 p-3 text-xs">
      <p className="mb-1 flex items-center gap-1 font-semibold"><Webhook className="size-3.5" /> Catch hook URL — POST JSON here from any form, Zapier, Make or your backend</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate">{url}</code>
        <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(url); toast("Copied", "success"); }}><Copy className="size-3.5" /> Copy</button>
      </div>
      <pre className="mt-2 overflow-x-auto rounded bg-surface p-2 text-[11px] text-muted">{`curl -X POST ${url} \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Neha","email":"neha@acme.io","phone":"+91 90000 11111","company":"Acme","message":"Need a demo"}'`}</pre>
    </div>
  );
}

function TemplateHint({ board, catchHook }: { board?: BoardS; catchHook: boolean }) {
  return (
    <p className="mt-1 text-[11px] text-faint">
      Use variables: <code>{"{{item.name}}"}</code>{board?.columns.slice(0, 3).map((c) => <span key={c.id}> <code>{`{{item.${c.title}}}`}</code></span>)} <code>{"{{today}}"}</code>
      {catchHook && <> · <code>{"{{payload.email}}"}</code> (any field from the webhook body)</>} · <code>{"{{outputs.score}}"}</code> (from an app action)
    </p>
  );
}

function ValueInput({ col, value, onChange, members, allowTemplate = true }: { col?: Column; value: unknown; onChange: (v: unknown) => void; members: Member[]; allowTemplate?: boolean }) {
  if (col && (col.type === "status" || col.type === "dropdown"))
    return (
      <select className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
        <option value="">— choose —</option>
        {col.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    );
  if (col?.type === "person")
    return (
      <select className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
        <option value="">— choose —</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    );
  if (col?.type === "checkbox") return <select className="input" value={String(value ?? "true")} onChange={(e) => onChange(e.target.value)}><option value="true">Checked</option><option value="false">Unchecked</option></select>;
  return <input className="input" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={allowTemplate ? (col?.type === "date" ? "{{today}} or 2026-11-01" : "Value or {{template}}") : "Value"} />;
}

function Builder({ initial, boards, apps, members, channels, onClose, onSaved }: { initial: Auto; boards: BoardS[]; apps: AppI[]; members: Member[]; channels: ChanI[]; onClose: () => void; onSaved: (a: Auto) => void }) {
  const toast = useToast();
  const [a, setA] = useState<Auto>(initial);
  const [busy, setBusy] = useState(false);
  const board = boards.find((b) => b._id === a.board);
  const cols = board?.columns || [];
  const set = (p: Partial<Auto>) => setA({ ...a, ...p });
  const setTrig = (config: Record<string, unknown>) => set({ trigger: { ...a.trigger, config: { ...a.trigger.config, ...config } } });
  const setAct = (i: number, p: Partial<Action>) => set({ actions: a.actions.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const setActCfg = (i: number, c: Record<string, unknown>) => setAct(i, { config: { ...a.actions[i].config, ...c } });
  const trigCol = cols.find((c) => c.id === a.trigger.config.column);
  const appTriggers = useMemo(() => apps.flatMap((x) => x.triggers.map((t) => ({ app: x, t }))), [apps]);

  async function save() {
    if (!a.name.trim()) return toast("Give the automation a name", "error");
    setBusy(true);
    const r = await api<{ automation: Auto }>(a._id ? `/api/automations/${a._id}` : "/api/automations", { method: a._id ? "PATCH" : "POST", json: { board: a.board, name: a.name, enabled: a.enabled, trigger: a.trigger, conditions: a.conditions, actions: a.actions } });
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    toast("Automation saved", "success");
    onSaved(r.data.automation);
  }

  return (
    <Modal open onClose={onClose} wide title={a._id ? "Edit automation" : "New automation"} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={save}>Save automation</button></>}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div><label className="label">Name</label><input className="input" value={a.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Qualified lead → create deal" /></div>
          <div><label className="label">Board</label>
            <select className="input" value={a.board} disabled={!!a._id} onChange={(e) => set({ board: e.target.value, trigger: { type: a.trigger.type, config: {} }, conditions: [] })}>
              {boards.map((b) => <option key={b._id} value={b._id}>{b.icon} {b.name}</option>)}
            </select>
          </div>
        </div>

        <section className="rounded-lg border-2 border-brand/40 bg-brand-soft/30 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand">⚡ Trigger</p>
          <select className="input" value={a.trigger.type} onChange={(e) => set({ trigger: { type: e.target.value, config: {} } })}>
            {Object.entries(TRIG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {a.trigger.type === "column_changed" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><label className="label">Column</label>
                <select className="input" value={String(a.trigger.config.column || "")} onChange={(e) => setTrig({ column: e.target.value, to: "" })}>
                  <option value="">— choose —</option>
                  {cols.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              {trigCol && (trigCol.type === "status" || trigCol.type === "dropdown" || trigCol.type === "person") && (
                <div><label className="label">Changes to (optional)</label><ValueInput col={trigCol} value={a.trigger.config.to} onChange={(v) => setTrig({ to: v })} members={members} allowTemplate={false} /></div>
              )}
            </div>
          )}
          {a.trigger.type === "item_created" && board && (
            <div className="mt-3"><label className="label">Only in group (optional)</label>
              <select className="input" value={String(a.trigger.config.group || "")} onChange={(e) => setTrig({ group: e.target.value })}>
                <option value="">Any group</option>
                {board.groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
          )}
          {a.trigger.type === "catch_hook" && <p className="mt-2 text-xs text-muted">After saving you&apos;ll get a unique URL. Every POST to it runs this automation with the JSON body available as <code>{"{{payload.*}}"}</code>. Start the actions with “Create an item”.</p>}
          {a.trigger.type === "message_received" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><label className="label">Channel</label>
                <select className="input" value={String(a.trigger.config.channel || "")} onChange={(e) => setTrig({ channel: e.target.value })}>
                  <option value="">Any channel</option>
                  {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="label">Message contains (optional)</label><input className="input" value={String(a.trigger.config.contains || "")} onChange={(e) => setTrig({ contains: e.target.value })} placeholder="e.g. pricing" /></div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="accent-[var(--brand)]" checked={!!a.trigger.config.onlyNew} onChange={(e) => setTrig({ onlyNew: e.target.checked })} /> Only the first message of a new conversation</label>
              <p className="text-xs text-faint sm:col-span-2">Runs on the linked lead (if any). Variables: <code>{"{{payload.text}}"}</code> <code>{"{{payload.contact.name}}"}</code> <code>{"{{payload.channel}}"}</code>. Choose the board that the channel creates leads in.</p>
            </div>
          )}
          {a.trigger.type === "app_trigger" && (
            <div className="mt-3">
              {appTriggers.length === 0 ? <p className="text-xs text-muted">None of your installed apps declare triggers. Install one from the Marketplace (e.g. Softphone → “Call ended”).</p> : (
                <select className="input" value={`${a.trigger.config.app || ""}|${a.trigger.config.key || ""}`} onChange={(e) => { const [app, key] = e.target.value.split("|"); setTrig({ app, key }); }}>
                  <option value="|">— choose an app trigger —</option>
                  {appTriggers.map(({ app, t }) => <option key={app.appId + t.key} value={`${app.appId}|${t.key}`}>{app.icon} {app.name} — {t.label}</option>)}
                </select>
              )}
              <p className="mt-1 text-xs text-faint">The trigger&apos;s data is available as <code>{"{{payload.*}}"}</code>, e.g. <code>{"{{payload.outcome}}"}</code>.</p>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-warn">Conditions (all must match)</p>
            <button className="btn btn-ghost btn-sm" onClick={() => set({ conditions: [...a.conditions, { column: cols[0]?.id || "name", op: "equals", value: "" }] })}><Plus className="size-3.5" /> Condition</button>
          </div>
          {a.conditions.length === 0 && <p className="text-xs text-muted">No conditions — runs every time the trigger fires.</p>}
          {a.conditions.map((c, i) => {
            const col = cols.find((x) => x.id === c.column);
            return (
              <div key={i} className="mt-2 grid grid-cols-[1fr_120px_1fr_auto] gap-2">
                <select className="input" value={c.column} onChange={(e) => set({ conditions: a.conditions.map((x, j) => (j === i ? { ...x, column: e.target.value, value: "" } : x)) })}>
                  <option value="name">Name</option>
                  {cols.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                </select>
                <select className="input" value={c.op} onChange={(e) => set({ conditions: a.conditions.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)) })}>
                  {Object.entries(OPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {["is_empty", "not_empty"].includes(c.op) ? <span /> : <ValueInput col={col} value={c.value} onChange={(v) => set({ conditions: a.conditions.map((x, j) => (j === i ? { ...x, value: v } : x)) })} members={members} allowTemplate={false} />}
                <button className="btn btn-ghost btn-sm" onClick={() => set({ conditions: a.conditions.filter((_, j) => j !== i) })} aria-label="Remove"><Trash2 className="size-3.5" /></button>
              </div>
            );
          })}
        </section>

        {a.actions.map((x, i) => {
          const target = x.type === "create_item" ? boards.find((b) => b._id === (x.config.board || a.board)) : board;
          const appSel = apps.find((p) => p.installationId === x.config.installation);
          const actDef = appSel?.actions.find((d) => d.key === x.config.action);
          return (
            <div key={i}>
              <div className="flex justify-center text-faint"><ArrowDown className="size-4" /></div>
              <section className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-success">Action {i + 1}</p>
                  {a.actions.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => set({ actions: a.actions.filter((_, j) => j !== i) })}><Trash2 className="size-3.5" /></button>}
                </div>
                <select className="input" value={x.type} onChange={(e) => setAct(i, { type: e.target.value, config: {} })}>
                  {Object.entries(ACT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div className="mt-3 space-y-3">
                  {x.type === "set_column" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select className="input" value={String(x.config.column || "")} onChange={(e) => setActCfg(i, { column: e.target.value, value: "" })}>
                        <option value="">— column —</option>
                        {cols.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                      <ValueInput col={cols.find((c) => c.id === x.config.column)} value={x.config.value} onChange={(v) => setActCfg(i, { value: v })} members={members} />
                    </div>
                  )}
                  {x.type === "move_to_group" && (
                    <select className="input" value={String(x.config.group || "")} onChange={(e) => setActCfg(i, { group: e.target.value })}>
                      <option value="">— group —</option>
                      {board?.groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  )}
                  {x.type === "create_item" && (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div><label className="label">In board</label>
                          <select className="input" value={String(x.config.board || a.board)} onChange={(e) => setActCfg(i, { board: e.target.value, group: "", values: {} })}>
                            {boards.map((b) => <option key={b._id} value={b._id}>{b.icon} {b.name}</option>)}
                          </select>
                        </div>
                        <div><label className="label">Group</label>
                          <select className="input" value={String(x.config.group || "")} onChange={(e) => setActCfg(i, { group: e.target.value })}>
                            <option value="">First group</option>
                            {target?.groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                          </select>
                        </div>
                      </div>
                      <div><label className="label">Item name</label><input className="input" value={String(x.config.name || "")} onChange={(e) => setActCfg(i, { name: e.target.value })} placeholder={a.trigger.type === "catch_hook" ? "{{payload.name}}" : "{{item.name}} – deal"} /></div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {target?.columns.map((c) => (
                          <div key={c.id}><label className="label">{c.title}</label>
                            <input className="input" value={String(((x.config.values as Record<string, string>) || {})[c.id] || "")} onChange={(e) => setActCfg(i, { values: { ...((x.config.values as Record<string, string>) || {}), [c.id]: e.target.value } })} placeholder={c.type === "status" || c.type === "dropdown" ? c.options.map((o) => o.label).slice(0, 3).join(" / ") : "{{…}}"} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {x.type === "reply_message" && <textarea className="input min-h-20" value={String(x.config.text || "")} onChange={(e) => setActCfg(i, { text: e.target.value })} placeholder="Hi {{payload.contact.name}}, thanks for reaching out! A teammate will reply within an hour." />}
                  {x.type === "add_note" && <textarea className="input min-h-20" value={String(x.config.text || "")} onChange={(e) => setActCfg(i, { text: e.target.value })} placeholder="Note text — {{item.name}} …" />}
                  {x.type === "notify" && (
                    <>
                      <select className="input" value={String(x.config.target || "all")} onChange={(e) => setActCfg(i, { target: e.target.value })}>
                        <option value="all">Everyone in the workspace</option>
                        <option value="person_column">The person in a column…</option>
                        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      {x.config.target === "person_column" && (
                        <select className="input" value={String(x.config.column || "")} onChange={(e) => setActCfg(i, { column: e.target.value })}>
                          <option value="">— person column —</option>
                          {cols.filter((c) => c.type === "person").map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                      )}
                      <input className="input" value={String(x.config.text || "")} onChange={(e) => setActCfg(i, { text: e.target.value })} placeholder="Message — {{item.name}} needs attention" />
                    </>
                  )}
                  {x.type === "send_webhook" && (
                    <>
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <select className="input" value={String(x.config.method || "POST")} onChange={(e) => setActCfg(i, { method: e.target.value })}>{["POST", "PUT", "PATCH"].map((m) => <option key={m}>{m}</option>)}</select>
                        <input className="input" value={String(x.config.url || "")} onChange={(e) => setActCfg(i, { url: e.target.value })} placeholder="https://hooks.example.com/…" />
                      </div>
                      <textarea className="input min-h-20 font-mono text-xs" value={String(x.config.body || "")} onChange={(e) => setActCfg(i, { body: e.target.value })} placeholder={'Optional JSON body. Empty = full item JSON.\n{"lead":"{{item.name}}","email":"{{item.Email}}"}'} />
                    </>
                  )}
                  {x.type === "app_action" && (
                    <>
                      <select className="input" value={`${x.config.installation || ""}|${x.config.action || ""}`} onChange={(e) => { const [installation, action] = e.target.value.split("|"); setAct(i, { config: { installation, action, inputs: {}, outputMap: {} } }); }}>
                        <option value="|">— choose an app action —</option>
                        {apps.flatMap((p) => p.actions.map((d) => <option key={p.installationId + d.key} value={`${p.installationId}|${d.key}`}>{p.icon} {p.name} — {d.label}</option>))}
                      </select>
                      {actDef && (
                        <>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {actDef.fields.map((f) => (
                              <div key={f.key}><label className="label">{f.label}{f.required ? " *" : ""}</label>
                                <input className="input" value={String(((x.config.inputs as Record<string, string>) || {})[f.key] || "")} onChange={(e) => setActCfg(i, { inputs: { ...((x.config.inputs as Record<string, string>) || {}), [f.key]: e.target.value } })} placeholder={`{{item.${f.label}}}`} />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="label">Save outputs into columns</label>
                            {Object.entries((x.config.outputMap as Record<string, string>) || {}).map(([k, v]) => (
                              <div key={k} className="mb-1 flex items-center gap-2 text-sm"><code>{k}</code> → {cols.find((c) => c.id === v)?.title}
                                <button className="text-faint hover:text-danger" onClick={() => { const m = { ...((x.config.outputMap as Record<string, string>) || {}) }; delete m[k]; setActCfg(i, { outputMap: m }); }}>×</button>
                              </div>
                            ))}
                            <OutputAdder cols={cols} onAdd={(k, c) => setActCfg(i, { outputMap: { ...((x.config.outputMap as Record<string, string>) || {}), [k]: c } })} />
                          </div>
                        </>
                      )}
                    </>
                  )}
                  {["set_column", "create_item", "add_note", "notify", "send_webhook", "app_action", "reply_message"].includes(x.type) && <TemplateHint board={board} catchHook={["catch_hook", "app_trigger", "message_received"].includes(a.trigger.type)} />}
                </div>
              </section>
            </div>
          );
        })}
        <button className="btn btn-secondary w-full" onClick={() => set({ actions: [...a.actions, { type: "add_note", config: {} }] })} disabled={a.actions.length >= 10}><Plus className="size-4" /> Add action</button>
      </div>
    </Modal>
  );
}

function OutputAdder({ cols, onAdd }: { cols: Column[]; onAdd: (k: string, c: string) => void }) {
  const [k, setK] = useState("");
  const [c, setC] = useState("");
  return (
    <div className="flex gap-2">
      <input className="input !w-40" placeholder="output key (e.g. score)" value={k} onChange={(e) => setK(e.target.value)} />
      <select className="input" value={c} onChange={(e) => setC(e.target.value)}>
        <option value="">— column —</option>
        {cols.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
      </select>
      <button className="btn btn-secondary btn-sm" disabled={!k || !c} onClick={() => { onAdd(k.trim(), c); setK(""); setC(""); }}>Map</button>
    </div>
  );
}
