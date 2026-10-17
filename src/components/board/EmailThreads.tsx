"use client";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ChevronDown, ChevronRight, CornerUpLeft, Mail, Send } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { timeAgo } from "@/components/ui";

type Msg = { _id: string; direction: "in" | "out" | "note"; authorLabel: string; author?: { name: string } | null; text: string; delivery: string; subject?: string; to?: string; cc?: string; createdAt: string };
type Thread = { _id: string; subject: string; contact: { name: string; email: string }; lastMessageAt: string; messages: Msg[] };

export default function EmailThreads({ itemId, onCompose, refresh }: { itemId: string; onCompose: () => void; refresh: number }) {
  const toast = useToast();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [smtp, setSmtp] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await api<{ threads: Thread[]; smtp: boolean }>(`/api/items/${itemId}/emails`);
    if (r.ok) { setThreads(r.data.threads); setSmtp(r.data.smtp); setOpen((o) => o ?? r.data.threads[0]?._id ?? null); }
  }, [itemId]);
  useEffect(() => { load(); }, [load, refresh]);

  async function send(t: Thread) {
    setBusy(true);
    const r = await api<{ message: Msg }>(`/api/conversations/${t._id}/messages`, { method: "POST", json: { text: reply } });
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    if (r.data.message.delivery !== "sent") toast(`Saved, not delivered: ${r.data.message.delivery.replace(/^failed:\s*/, "")}`, "error");
    setReply("");
    load();
  }

  return (
    <div className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{threads ? `${threads.length} email thread${threads.length === 1 ? "" : "s"}` : "Loading…"}</p>
        <button className="btn btn-primary btn-sm" onClick={onCompose}><Mail className="size-3.5" /> New email</button>
      </div>
      {!smtp && (
        <p className="flex items-start gap-2 rounded-lg bg-warn/10 px-3 py-2 text-xs text-warn">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Outgoing email isn&apos;t configured (set <code>SMTP_URL</code>). Emails are saved to the thread but not delivered.
        </p>
      )}
      {threads?.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">No emails yet. Start a conversation with “New email”.</p>}
      {threads?.map((t) => {
        const isOpen = open === t._id;
        const last = t.messages[t.messages.length - 1];
        return (
          <div key={t._id} className="rounded-lg border border-border">
            <button className="flex w-full items-center gap-2 px-3 py-2.5 text-left" onClick={() => setOpen(isOpen ? null : t._id)}>
              {isOpen ? <ChevronDown className="size-4 text-muted" /> : <ChevronRight className="size-4 text-muted" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t.subject || "(no subject)"}</span>
                {!isOpen && last && <span className="block truncate text-xs text-muted">{last.text}</span>}
              </span>
              <span className="shrink-0 rounded-full bg-surface-2 px-2 text-xs text-muted">{t.messages.filter((m) => m.direction !== "note").length}</span>
              <span className="shrink-0 text-xs text-muted">{timeAgo(t.lastMessageAt)}</span>
            </button>
            {isOpen && (
              <div className="border-t border-border">
                {t.messages.map((m) => (
                  <div key={m._id} className={clsx("border-b border-border px-4 py-3", m.direction === "in" ? "bg-surface" : m.direction === "note" ? "bg-warn/5" : "bg-surface-2/50")}>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs">
                      <span className="font-semibold text-text">{m.direction === "in" ? `${t.contact.name || t.contact.email}` : m.author?.name || m.authorLabel}</span>
                      <span className="text-muted">{m.direction === "in" ? `<${t.contact.email}>` : m.direction === "note" ? "internal note" : `to ${m.to || t.contact.email}${m.cc ? `, cc ${m.cc}` : ""}`}</span>
                      <span className="flex-1" />
                      {m.direction === "out" && <span className={clsx("rounded px-1.5", m.delivery === "sent" ? "bg-success/15 text-success" : "bg-danger/10 text-danger")} title={m.delivery}>{m.delivery === "sent" ? "Sent" : "Not sent"}</span>}
                      <span className="text-muted">{timeAgo(m.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm">{m.text}</p>
                    {m.direction === "out" && m.delivery !== "sent" && (
                      <a className="mt-1 inline-block text-xs text-brand hover:underline" href={`mailto:${encodeURIComponent(m.to || t.contact.email)}?subject=${encodeURIComponent(m.subject || t.subject)}&body=${encodeURIComponent(m.text)}`}>Open in my mail app instead</a>
                    )}
                  </div>
                ))}
                <div className="p-3">
                  <div className="rounded-lg border border-border focus-within:ring-2 focus-within:ring-brand/30">
                    <p className="flex items-center gap-1 px-3 pt-2 text-xs text-muted"><CornerUpLeft className="size-3" /> Reply to {t.contact.email}</p>
                    <textarea className="block w-full resize-y bg-transparent px-3 py-2 text-sm outline-none" rows={3} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && reply.trim() && send(t)} />
                    <div className="flex justify-end px-2 pb-2"><button className="btn btn-primary btn-sm" disabled={busy || !reply.trim()} onClick={() => send(t)}><Send className="size-3.5" /> Reply</button></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
