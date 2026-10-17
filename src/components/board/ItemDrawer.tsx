"use client";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Bot, Mail, MessageSquare, Phone, PhoneCall, PlusCircle, Puzzle, RefreshCw, Trash2, X, Zap } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { Avatar, timeAgo } from "@/components/ui";
import { useDialer } from "@/components/Dialer";
import AppFrame from "@/components/AppFrame";
import Cell from "./Cell";
import { displayValue } from "@/lib/values";
import type { BoardT, ItemT, Member, PanelApp } from "./types";

type Act = { _id: string; type: string; text: string; data: Record<string, unknown>; actor?: { name: string; image?: string } | null; actorLabel?: string; createdAt: string; due?: string; done?: boolean; assignee?: { _id: string; name: string; image?: string } | null };

export default function ItemDrawer({ board, item, members, panelApps, user, workspace, onClose, onPatch, onDelete }: {
  board: BoardT; item: ItemT; members: Member[]; panelApps: PanelApp[]; user: Record<string, unknown>; workspace: Record<string, unknown>;
  onClose: () => void; onPatch: (patch: { name?: string; values?: Record<string, unknown> }) => void; onDelete: () => void;
}) {
  const toast = useToast();
  const dial = useDialer();
  const [tab, setTab] = useState<"activity" | "tasks" | "apps">("activity");
  const [task, setTask] = useState({ text: "", due: "", assignee: String(user.id || "") });
  const [acts, setActs] = useState<Act[] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ activities: Act[] }>(`/api/items/${item._id}/activities`);
    if (r.ok) setActs(r.data.activities);
  }, [item._id]);
  useEffect(() => {
    setActs(null);
    load();
  }, [load, item.updatedAt]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function addNote() {
    if (!note.trim()) return;
    setBusy(true);
    const r = await api(`/api/items/${item._id}/activities`, { method: "POST", json: { type: "note", text: note } });
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    setNote("");
    load();
  }

  async function addTask() {
    if (!task.text.trim()) return;
    const r = await api(`/api/items/${item._id}/activities`, { method: "POST", json: { type: "task", text: task.text, due: task.due || null, assignee: task.assignee || null } });
    if (!r.ok) return toast(r.error, "error");
    setTask({ ...task, text: "", due: "" });
    load();
  }
  async function toggleTask(a: Act) {
    setActs((xs) => xs?.map((x) => (x._id === a._id ? { ...x, done: !x.done } : x)) || null);
    await api(`/api/activities/${a._id}`, { method: "PATCH", json: { done: !a.done } });
  }
  async function deleteAct(a: Act) {
    if (!confirm("Delete?")) return;
    const r = await api(`/api/activities/${a._id}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, "error");
    load();
  }
  const tasks = (acts || []).filter((a) => a.type === "task");
  const timeline = (acts || []).filter((a) => a.type !== "task");
  const phoneCol = board.columns.find((c) => c.type === "phone");
  const phone = phoneCol ? String(item.values[phoneCol.id] ?? "") : "";
  const emailCol = board.columns.find((c) => c.type === "email");
  const email = emailCol ? String(item.values[emailCol.id] ?? "") : "";
  const label = (id: string) => board.columns.find((c) => c.id === id);
  const show = (cid: string, v: unknown) => {
    if (cid === "name") return String(v ?? "");
    if (cid === "group") return board.groups.find((g) => g.id === v)?.title ?? "";
    const c = label(cid);
    if (!c) return String(v ?? "");
    if (c.type === "person") return members.find((m) => m.id === v)?.name ?? "";
    return displayValue(c, v);
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/25" onMouseDown={onClose}>
      <aside className="animate-slidein flex h-full w-full max-w-2xl flex-col bg-surface shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-2 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">{board.icon} {board.name}</p>
            <input
              defaultValue={item.name}
              key={item.name}
              onBlur={(e) => e.target.value.trim() && e.target.value !== item.name && onPatch({ name: e.target.value.trim() })}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-full rounded bg-transparent text-xl font-bold outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          {phone && (
            <button onClick={() => dial({ phone, itemId: item._id, itemName: item.name, onLogged: load })} className="btn btn-sm bg-success text-white">
              <Phone className="size-3.5" /> Call
            </button>
          )}
          {email && (
            <a href={`mailto:${email}`} className="btn btn-secondary btn-sm">
              <Mail className="size-3.5" /> Email
            </a>
          )}
          <button onClick={() => confirm(`Delete “${item.name}”?`) && onDelete()} className="btn btn-ghost btn-sm !p-2 hover:!text-danger" aria-label="Delete">
            <Trash2 className="size-4" />
          </button>
          <button onClick={onClose} className="btn btn-ghost btn-sm !p-2" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 border-b border-border px-5 py-4 sm:grid-cols-2">
            {board.columns.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-xs font-medium text-muted">{c.title}</span>
                <div className="relative h-8 min-w-0 flex-1 overflow-visible rounded border border-transparent hover:border-border">
                  <Cell col={c} item={item} members={members} compact onChange={(v) => onPatch({ values: { [c.id]: v } })} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-1 border-b border-border px-4">
            {(["activity", "tasks", "apps"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={clsx("relative px-3 py-2.5 text-sm font-medium", tab === t ? "text-text" : "text-muted")}>
                {t === "activity" ? "Activity" : t === "tasks" ? `Tasks (${tasks.filter((x) => !x.done).length})` : `Apps (${panelApps.length})`}
                {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand" />}
              </button>
            ))}
          </div>
          {tab === "tasks" ? (
            <div className="space-y-3 p-5">
              <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_140px_150px_auto]">
                <input className="input" placeholder="Task, e.g. Send proposal" value={task.text} onChange={(e) => setTask({ ...task, text: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addTask()} />
                <input className="input" type="date" value={task.due} onChange={(e) => setTask({ ...task, due: e.target.value })} />
                <select className="input" value={task.assignee} onChange={(e) => setTask({ ...task, assignee: e.target.value })}>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                <button className="btn btn-primary" onClick={addTask} disabled={!task.text.trim()}>Add</button>
              </div>
              {tasks.length === 0 && <p className="text-sm text-muted">No tasks yet.</p>}
              {tasks.map((a) => {
                const overdue = !a.done && a.due && a.due.slice(0, 10) < new Date().toISOString().slice(0, 10);
                return (
                  <div key={a._id} className="group flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                    <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={!!a.done} onChange={() => toggleTask(a)} aria-label="Done" />
                    <span className={clsx("min-w-0 flex-1", a.done && "text-muted line-through")}>{a.text}</span>
                    {a.assignee && <Avatar name={a.assignee.name} image={a.assignee.image} size={20} />}
                    {a.due && <span className={clsx("text-xs", overdue ? "text-danger" : "text-muted")}>{a.due.slice(0, 10)}</span>}
                    <button onClick={() => deleteAct(a)} className="text-faint opacity-0 hover:text-danger group-hover:opacity-100" aria-label="Delete task"><Trash2 className="size-3.5" /></button>
                  </div>
                );
              })}
            </div>
          ) : tab === "activity" ? (
            <div className="space-y-4 p-5">
              <div className="rounded-lg border border-border">
                <textarea className="block w-full resize-y rounded-t-lg bg-transparent p-3 text-sm outline-none" rows={3} placeholder="Write an update or note…" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
                  <div className="flex gap-1">
                    {phone && (
                      <button onClick={() => dial({ phone, itemId: item._id, itemName: item.name, onLogged: load })} className="btn btn-ghost btn-sm">
                        <PhoneCall className="size-3.5" /> Log a call
                      </button>
                    )}
                  </div>
                  <button onClick={addNote} disabled={busy || !note.trim()} className="btn btn-primary btn-sm">
                    Post update
                  </button>
                </div>
              </div>
              {acts === null && <p className="text-sm text-muted">Loading…</p>}
              {timeline.length === 0 && acts && <p className="text-sm text-muted">No activity yet.</p>}
              <ol className="relative space-y-4 border-l border-border pl-5">
                {timeline.map((a) => (
                  <li key={a._id} className="relative">
                    <span className={clsx("absolute -left-[31px] flex size-5 items-center justify-center rounded-full text-white", a.type === "call" ? "bg-success" : a.type === "note" ? "bg-brand" : a.type === "update" ? "bg-warn" : a.type === "email" ? "bg-[#579bfc]" : "bg-faint")}>
                      {a.type === "call" ? <Phone className="size-3" /> : a.type === "note" ? <MessageSquare className="size-3" /> : a.type === "update" ? <RefreshCw className="size-3" /> : a.type === "created" ? <PlusCircle className="size-3" /> : <Zap className="size-3" />}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      {a.actor ? <Avatar name={a.actor.name} image={a.actor.image} size={18} /> : a.actorLabel ? <Bot className="size-4" /> : null}
                      <span className="font-semibold text-text">{a.actorLabel || a.actor?.name || "System"}</span>
                      {a.actor && a.actorLabel && <span>via {a.actor.name}</span>}
                      <span>· {timeAgo(a.createdAt)}</span>
                    </div>
                    {a.type === "update" && (
                      <ul className="mt-1 space-y-0.5 text-sm">
                        {((a.data?.changes as { column: string; title: string; from: unknown; to: unknown }[]) || []).map((c, i) => (
                          <li key={i}>
                            <b>{c.title}</b>: <span className="text-muted line-through">{show(c.column, c.from) || "empty"}</span> → <span>{show(c.column, c.to) || "empty"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {a.type === "call" && (
                      <p className="mt-1 text-sm">
                        📞 {String(a.data?.direction || "outbound")} call · <b>{String(a.data?.outcome || "—")}</b>
                        {a.data?.durationSec ? ` · ${Math.floor(Number(a.data.durationSec) / 60)}m ${Number(a.data.durationSec) % 60}s` : ""}
                      </p>
                    )}
                    {a.type === "created" && <p className="mt-1 text-sm text-muted">Created this {board.itemLabel.toLowerCase()} {a.text}</p>}
                    {a.text && a.type !== "created" && <p className="mt-1 whitespace-pre-wrap rounded-md bg-surface-2 px-3 py-2 text-sm">{a.text}</p>}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="space-y-4 p-5">
              {panelApps.length === 0 && (
                <p className="text-sm text-muted">
                  <Puzzle className="mr-1 inline size-4" />
                  No item-panel apps installed. Browse the Marketplace to add some.
                </p>
              )}
              {panelApps.map((a) => (
                <div key={a.installationId} className="rounded-lg border border-border">
                  <p className="border-b border-border px-3 py-2 text-sm font-semibold">{a.icon} {a.name}</p>
                  <AppFrame installationId={a.installationId} url={a.url} surface="item_panel" context={{ user, workspace, item: { id: item._id, name: item.name }, board: { id: board._id, name: board.name } }} height={260} onChanged={load} />
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
