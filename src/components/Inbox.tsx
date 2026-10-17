"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { CheckCircle2, Globe, Lock, Mail, MessageCircle, MessagesSquare, Phone, Plus, Search, Send, Smartphone, UserPlus } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { Avatar, Empty, timeAgo } from "@/components/ui";
import EmailComposer from "@/components/EmailComposer";

type Ch = { _id: string; name: string; type: string; active: boolean };
type Conv = { _id: string; channel: { _id: string; name: string; type: string }; contact: { name: string; email: string; phone: string }; subject: string; status: string; assignee?: { _id: string; name: string; image?: string } | null; lastMessage: string; lastMessageAt: string; unread: number; item?: string };
type Msg = { _id: string; direction: "in" | "out" | "note"; text: string; authorLabel: string; author?: { name: string; image?: string } | null; delivery: string; createdAt: string };
type Member = { id: string; name: string; image: string };

export const CH_ICON: Record<string, typeof Mail> = { webchat: Globe, email: Mail, sms: Smartphone, whatsapp: MessageCircle, custom: MessagesSquare };
const CH_COLOR: Record<string, string> = { webchat: "#6161ff", email: "#579bfc", sms: "#fdab3d", whatsapp: "#25d366", custom: "#a25ddc" };

export default function Inbox({ channels, members, me, canAdmin }: { channels: Ch[]; members: Member[]; me: string; canAdmin: boolean }) {
  const toast = useToast();
  const path = usePathname();
  const sp = useSearchParams();
  const [status, setStatus] = useState("open");
  const [channel, setChannel] = useState("");
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState("");
  const [list, setList] = useState<Conv[]>([]);
  const [counts, setCounts] = useState<Record<string, { n: number; unread: number }>>({});
  const sel = sp.get("c");
  const [detail, setDetail] = useState<{ conversation: Conv & { item?: string }; messages: Msg[]; channel: { name: string; type: string }; item: { _id: string; name: string; board: string } | null } | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [compose, setCompose] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const u = new URLSearchParams({ status });
    if (channel) u.set("channel", channel);
    if (mine) u.set("mine", "1");
    if (q) u.set("q", q);
    const r = await api<{ conversations: Conv[]; counts: typeof counts }>(`/api/conversations?${u}`);
    if (r.ok) { setList(r.data.conversations); setCounts(r.data.counts); }
  }, [status, channel, mine, q]);
  const loadDetail = useCallback(async () => {
    if (!sel) return setDetail(null);
    const r = await api<NonNullable<typeof detail>>(`/api/conversations/${sel}`);
    if (r.ok) setDetail(r.data);
  }, [sel]);
  useEffect(() => { loadList(); const t = setInterval(loadList, 5000); return () => clearInterval(t); }, [loadList]);
  useEffect(() => { loadDetail(); const t = setInterval(loadDetail, 4000); return () => clearInterval(t); }, [loadDetail]);
  useEffect(() => { logRef.current?.scrollTo({ top: 1e9 }); }, [detail?.messages.length]);

  const open = (id: string) => window.history.replaceState(null, "", `${path}?c=${id}`);
  async function send() {
    if (!text.trim() || !sel) return;
    setBusy(true);
    const r = await api<{ message: Msg }>(`/api/conversations/${sel}/messages`, { method: "POST", json: { text, note } });
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    if (r.data.message.delivery.startsWith("failed")) toast(`Saved, but not delivered: ${r.data.message.delivery.slice(8)}`, "error");
    setText("");
    loadDetail(); loadList();
  }
  async function patch(body: Record<string, unknown>) {
    if (!sel) return;
    const r = await api(`/api/conversations/${sel}`, { method: "PATCH", json: body });
    if (!r.ok) return toast(r.error, "error");
    loadDetail(); loadList();
  }

  if (channels.length === 0)
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="card"><Empty art="mail" title="Connect your first channel">Add a live-chat widget for your website, an email address, SMS or WhatsApp number in <Link href="/app/settings?tab=channels" className="text-brand">Settings → Channels</Link>. Every conversation lands here and links to a lead automatically.</Empty></div>
      </div>
    );

  const c = detail?.conversation;
  return (
    <div className="flex h-full min-h-0">
      {/* list */}
      <div className={clsx("flex w-full flex-col border-r border-border bg-surface md:w-80", sel && "hidden md:flex")}>
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between"><h1 className="text-lg font-bold">Inbox</h1><div className="flex gap-1"><button className="btn btn-primary btn-sm" onClick={() => setCompose(true)}><Mail className="size-3.5" /> New email</button>{canAdmin && <Link href="/app/settings?tab=channels" className="btn btn-ghost btn-sm" aria-label="Add channel"><Plus className="size-3.5" /></Link>}</div></div>
          <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" /><input className="input !py-1.5 !pl-8" placeholder="Search conversations" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="flex gap-1">
            {["open", "pending", "closed", "all"].map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={clsx("btn btn-sm flex-1 capitalize", status === s ? "bg-brand-soft text-brand" : "btn-ghost")}>
                {s}{s !== "all" && counts[s]?.n ? ` ${counts[s].n}` : ""}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select className="input !py-1 text-xs" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="">All channels</option>
              {channels.map((ch) => <option key={ch._id} value={ch._id}>{ch.name}</option>)}
            </select>
            <button onClick={() => setMine(!mine)} className={clsx("btn btn-sm", mine ? "bg-brand-soft text-brand" : "btn-secondary")}>Mine</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.length === 0 && <p className="p-6 text-center text-sm text-muted">No {status === "all" ? "" : status} conversations.</p>}
          {list.map((x) => {
            const I = CH_ICON[x.channel?.type] || MessagesSquare;
            return (
              <button key={x._id} onClick={() => open(x._id)} className={clsx("flex w-full gap-3 border-b border-border px-3 py-3 text-left hover:bg-surface-2", sel === x._id && "bg-brand-soft/60")}>
                <div className="relative">
                  <Avatar name={x.contact.name || x.contact.email || x.contact.phone} size={36} />
                  <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full text-white" style={{ background: CH_COLOR[x.channel?.type] }}><I className="size-2.5" /></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={clsx("truncate text-sm", x.unread ? "font-bold" : "font-medium")}>{x.contact.name || x.contact.email || x.contact.phone || "Visitor"}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-faint">{timeAgo(x.lastMessageAt)}</span>
                  </div>
                  <p className={clsx("truncate text-xs", x.unread ? "text-text" : "text-muted")}>{x.lastMessage}</p>
                </div>
                {x.unread > 0 && <span className="mt-1 h-5 min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] font-bold leading-5 text-white">{x.unread}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* thread */}
      {!c ? (
        <div className="hidden flex-1 items-center justify-center md:flex"><Empty art="think" title="Select a conversation">Pick a chat on the left — Orbi is waiting.</Empty></div>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
              <button className="btn btn-ghost btn-sm md:hidden" onClick={() => window.history.replaceState(null, "", path)} aria-label="Back to list">←</button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.contact.name || c.contact.email || c.contact.phone}</p>
                <p className="truncate text-xs text-muted">{detail.channel?.name}{c.subject ? ` · ${c.subject}` : ""}</p>
              </div>
              <select className="input !w-auto !py-1 text-xs" value={c.assignee?._id || (c.assignee as unknown as string) || ""} onChange={(e) => patch({ assignee: e.target.value || null })}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.id === me ? "Me" : m.name}</option>)}
              </select>
              {c.status !== "closed" ? <button className="btn btn-secondary btn-sm" onClick={() => patch({ status: "closed" })}><CheckCircle2 className="size-3.5 text-success" /> Close</button> : <button className="btn btn-secondary btn-sm" onClick={() => patch({ status: "open" })}>Reopen</button>}
            </div>
            <div ref={logRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-bg p-4">
              {detail.messages.map((m) => (
                <div key={m._id} className={clsx("flex flex-col", m.direction === "in" ? "items-start" : "items-end")}>
                  <span className="mb-0.5 px-1 text-[11px] text-faint">{m.direction === "note" ? "🔒 Internal note · " : ""}{m.author?.name || m.authorLabel} · {timeAgo(m.createdAt)}</span>
                  <div className={clsx("max-w-[75%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm", m.direction === "in" ? "rounded-bl-sm border border-border bg-surface" : m.direction === "note" ? "rounded-br-sm border border-warn/40 bg-warn/15" : "rounded-br-sm bg-brand text-white")}>{m.text}</div>
                  {m.direction === "out" && m.delivery.startsWith("failed") && <span className="px-1 text-[11px] text-danger">Not delivered: {m.delivery.slice(8)}</span>}
                </div>
              ))}
            </div>
            <div className="border-t border-border bg-surface p-3">
              <div className="mb-2 flex gap-1 text-xs">
                <button onClick={() => setNote(false)} className={clsx("btn btn-sm", !note ? "bg-brand-soft text-brand" : "btn-ghost")}><Send className="size-3" /> Reply</button>
                <button onClick={() => setNote(true)} className={clsx("btn btn-sm", note ? "bg-warn/15 text-warn" : "btn-ghost")}><Lock className="size-3" /> Internal note</button>
              </div>
              <div className="flex gap-2">
                <textarea className={clsx("input min-h-[44px] resize-y", note && "!border-warn/50 !bg-warn/5")} rows={2} placeholder={note ? "Only your team sees this…" : `Reply via ${detail.channel?.name}… (Enter to send, Shift+Enter for a new line)`} value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button className="btn btn-primary self-end" disabled={busy || !text.trim()} onClick={send}><Send className="size-4" /></button>
              </div>
            </div>
          </div>
          {/* contact panel */}
          <aside className="hidden w-72 shrink-0 space-y-4 overflow-y-auto border-l border-border bg-surface p-4 lg:block">
            <div className="text-center">
              <Avatar name={c.contact.name || c.contact.email} size={56} className="mx-auto" />
              <p className="mt-2 font-semibold">{c.contact.name || "Unknown"}</p>
            </div>
            <div className="space-y-2 text-sm">
              {c.contact.email && <p className="flex items-center gap-2 truncate"><Mail className="size-4 text-muted" /> {c.contact.email}</p>}
              {c.contact.phone && <p className="flex items-center gap-2"><Phone className="size-4 text-muted" /> {c.contact.phone}</p>}
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted">CRM record</p>
              {detail.item ? (
                <Link href={`/app/boards/${detail.item.board}?item=${detail.item._id}`} className="block rounded-md bg-brand-soft px-3 py-2 text-sm font-medium text-brand hover:underline">📄 {detail.item.name} →</Link>
              ) : (
                <button className="btn btn-secondary btn-sm w-full" onClick={() => patch({ createLead: true })}><UserPlus className="size-3.5" /> Create lead</button>
              )}
              <p className="mt-2 text-[11px] text-muted">Messages are logged on the record&apos;s timeline.</p>
            </div>
          </aside>
        </>
      )}
    {compose && <EmailComposer vars={{ me: members.find((m) => m.id === me)?.name || "" }} onClose={() => setCompose(false)} onSent={(id) => { setStatus("all"); open(id); loadList(); }} />}
    </div>
  );
}
