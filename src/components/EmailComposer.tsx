"use client";
import { useEffect, useState } from "react";
import { FileText, Mail, Send, X } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";

export const EMAIL_TEMPLATES = [
  { name: "Intro", subject: "Quick intro from {{me}}", body: "Hi {{first_name}},\n\nThanks for your interest! I'd love to learn more about what you're looking for and see if we can help.\n\nWould you have 15 minutes this week for a quick call?\n\nBest,\n{{me}}" },
  { name: "Follow-up", subject: "Following up", body: "Hi {{first_name}},\n\nJust following up on my last note — let me know if you have any questions or if now isn't a good time.\n\nBest,\n{{me}}" },
  { name: "Send proposal", subject: "Proposal for {{company}}", body: "Hi {{first_name}},\n\nAs discussed, please find our proposal details below:\n\n• Scope:\n• Timeline:\n• Pricing:\n\nHappy to walk you through it.\n\nBest,\n{{me}}" },
  { name: "Meeting recap", subject: "Recap of our call", body: "Hi {{first_name}},\n\nThanks for your time today. Quick recap:\n\n1.\n2.\n\nNext steps:\n\nBest,\n{{me}}" },
];

export function fillTemplate(s: string, vars: Record<string, string>) {
  return s.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => vars[k] ?? m);
}

export default function EmailComposer({ to: to0 = "", name = "", itemId, vars = {}, onClose, onSent }: {
  to?: string; name?: string; itemId?: string; vars?: Record<string, string>; onClose: () => void; onSent?: (conversationId: string, delivery: string) => void;
}) {
  const toast = useToast();
  const [to, setTo] = useState(to0);
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const v = { name: name || to.split("@")[0], first_name: (name || to.split("@")[0]).split(/\s+/)[0], email: to, ...vars };

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), onClose());
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);

  function applyTemplate(i: number) {
    const t = EMAIL_TEMPLATES[i];
    if (!t) return;
    if (text.trim() && !confirm("Replace the current message with this template?")) return;
    setSubject(fillTemplate(t.subject, v));
    setText(fillTemplate(t.body, v));
  }

  async function send() {
    setBusy(true);
    const r = await api<{ conversation: { _id: string }; message: { delivery: string } }>("/api/emails", { method: "POST", json: { to, cc, subject, text: fillTemplate(text, v), itemId, name } });
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    const d = r.data.message.delivery;
    if (d === "sent") toast("Email sent ✉️", "success");
    else toast(`Saved to the thread, but not delivered: ${d.replace(/^failed:\s*/, "")}`, "error");
    onSent?.(r.data.conversation._id, d);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div className="animate-pop flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-xl bg-surface shadow-pop sm:rounded-xl" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="New email">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Mail className="size-4 text-brand" />
          <h2 className="flex-1 font-semibold">New email</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5" aria-label="Close"><X className="size-4" /></button>
        </div>
        <div className="space-y-0 border-b border-border text-sm">
          <label className="flex items-center gap-2 border-b border-border px-4 py-1.5">
            <span className="w-14 text-muted">To</span>
            <input className="min-w-0 flex-1 bg-transparent py-1 outline-none" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com" autoFocus={!to0} />
            {!showCc && <button type="button" className="text-xs text-muted hover:text-text" onClick={() => setShowCc(true)}>Cc</button>}
          </label>
          {showCc && (
            <label className="flex items-center gap-2 border-b border-border px-4 py-1.5">
              <span className="w-14 text-muted">Cc</span>
              <input className="min-w-0 flex-1 bg-transparent py-1 outline-none" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="comma-separated" />
            </label>
          )}
          <label className="flex items-center gap-2 px-4 py-1.5">
            <span className="w-14 text-muted">Subject</span>
            <input className="min-w-0 flex-1 bg-transparent py-1 font-medium outline-none" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" autoFocus={!!to0} />
          </label>
        </div>
        <textarea className="min-h-[240px] flex-1 resize-none bg-transparent p-4 text-sm outline-none" value={text} onChange={(e) => setText(e.target.value)} placeholder={"Write your email…\n\nTip: use {{first_name}}, {{name}}, {{company}}, {{me}}"} onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && to && text.trim() && send()} />
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
          <FileText className="size-4 text-muted" />
          <select className="input !h-8 !w-auto !py-0 text-sm" value="" onChange={(e) => applyTemplate(Number(e.target.value))} aria-label="Insert template">
            <option value="">Templates…</option>
            {EMAIL_TEMPLATES.map((t, i) => <option key={t.name} value={i}>{t.name}</option>)}
          </select>
          <span className="flex-1" />
          <span className="hidden text-xs text-faint sm:inline">Ctrl+Enter to send</span>
          <button className="btn btn-primary" disabled={busy || !to.trim() || !text.trim()} onClick={send}><Send className="size-4" /> {busy ? "Sending…" : "Send"}</button>
        </div>
      </div>
    </div>
  );
}
