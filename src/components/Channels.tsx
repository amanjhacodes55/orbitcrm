"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, Globe, Mail, MessageCircle, MessagesSquare, Plus, Smartphone, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { Modal, Switch } from "@/components/ui";

type Ch = { _id: string; type: string; name: string; token: string; active: boolean; settings: { color: string; greeting: string; leadBoard: string; autoCreateLead: boolean; outboundWebhookUrl: string; fromEmail: string; twilioSid: string; twilioFrom: string } };
const TYPES = [
  { type: "webchat", label: "Website live chat", icon: Globe, desc: "Chat bubble for your website — one script tag" },
  { type: "email", label: "Email", icon: Mail, desc: "Forward inbound emails (SendGrid/Mailgun/Postmark parse); reply via SMTP" },
  { type: "whatsapp", label: "WhatsApp", icon: MessageCircle, desc: "Twilio WhatsApp or any provider via webhooks" },
  { type: "sms", label: "SMS", icon: Smartphone, desc: "Twilio SMS or any provider via webhooks" },
  { type: "custom", label: "Custom channel", icon: MessagesSquare, desc: "Any source: POST JSON in, receive replies by webhook" },
];

export default function Channels({ boards, origin }: { boards: { id: string; name: string; icon: string }[]; origin: string }) {
  const toast = useToast();
  const [list, setList] = useState<Ch[]>([]);
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState<Ch | null>(null);
  const [twToken, setTwToken] = useState("");
  const load = useCallback(async () => { const r = await api<{ channels: Ch[] }>("/api/channels"); if (r.ok) setList(r.data.channels); }, []);
  useEffect(() => { load(); }, [load]);
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast("Copied", "success"); };
  async function create(type: string, label: string) {
    const r = await api<{ channel: Ch }>("/api/channels", { method: "POST", json: { type, name: label } });
    if (!r.ok) return toast(r.error, "error");
    setAdding(false);
    await load();
    setEdit(r.data.channel);
  }
  async function save() {
    if (!edit) return;
    const r = await api("/api/channels/" + edit._id, { method: "PATCH", json: { name: edit.name, active: edit.active, settings: edit.settings, ...(twToken ? { twilioToken: twToken } : {}) } });
    if (!r.ok) return toast(r.error, "error");
    toast("Channel saved", "success");
    setTwToken("");
    setEdit(null);
    load();
  }
  const inbound = (c: Ch) => `${origin}/api/public/inbound/${c.token}`;
  const snippet = (c: Ch) => `<script src="${origin}/widget.js" data-channel="${c.token}" data-color="${c.settings.color}" async></script>`;
  const icon = (t: string) => TYPES.find((x) => x.type === t)!.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Every message from these channels lands in the <b>Inbox</b> and links to a lead (found by email/phone, or created automatically).</p>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus className="size-4" /> Add channel</button>
      </div>
      {list.length === 0 && <div className="card p-8 text-center text-sm text-muted">No channels yet.</div>}
      {list.map((c) => {
        const I = icon(c.type);
        return (
          <div key={c._id} className="card p-4">
            <div className="flex items-center gap-3">
              <I className="size-5 text-brand" />
              <div className="min-w-0 flex-1"><p className="font-semibold">{c.name}</p><p className="text-xs text-muted">{TYPES.find((t) => t.type === c.type)?.label} · {c.active ? "active" : "paused"}</p></div>
              <button className="btn btn-secondary btn-sm" onClick={() => setEdit(JSON.parse(JSON.stringify(c)))}>Configure</button>
              <button className="btn btn-ghost btn-sm hover:!text-danger" onClick={async () => { if (!confirm(`Delete ${c.name} and all its conversations?`)) return; await api("/api/channels/" + c._id, { method: "DELETE" }); load(); }}><Trash2 className="size-3.5" /></button>
            </div>
            <div className="mt-3 rounded-lg bg-surface-2 p-3 text-xs">
              {c.type === "webchat" ? (
                <>
                  <p className="mb-1 font-semibold">Paste before &lt;/body&gt; on your website:</p>
                  <div className="flex gap-2"><code className="min-w-0 flex-1 truncate">{snippet(c)}</code><button className="btn btn-secondary btn-sm" onClick={() => copy(snippet(c))}><Copy className="size-3.5" /></button></div>
                  <p className="mt-2 text-muted">Preview: <a className="text-brand" href={`/chat/${c.token}`} target="_blank" rel="noreferrer">open chat window ↗</a></p>
                </>
              ) : (
                <>
                  <p className="mb-1 font-semibold">Inbound webhook URL (point your provider here):</p>
                  <div className="flex gap-2"><code className="min-w-0 flex-1 truncate">{inbound(c)}</code><button className="btn btn-secondary btn-sm" onClick={() => copy(inbound(c))}><Copy className="size-3.5" /></button></div>
                  <p className="mt-2 text-muted">
                    {c.type === "email" && "SendGrid Inbound Parse / Mailgun Routes / Postmark inbound → this URL. Replies are sent through SMTP_URL."}
                    {(c.type === "sms" || c.type === "whatsapp") && "Twilio console → Messaging → “A message comes in” webhook → this URL (HTTP POST). Add your Twilio SID/token to reply."}
                    {c.type === "custom" && "POST JSON { from, name, text } to receive; set an outbound webhook to receive agent replies."}
                  </p>
                </>
              )}
            </div>
          </div>
        );
      })}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a channel">
        <div className="space-y-2">
          {TYPES.map((t) => <button key={t.type} onClick={() => create(t.type, t.label)} className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left hover:border-brand hover:bg-brand-soft/40"><t.icon className="mt-0.5 size-5 text-brand" /><span><span className="block font-semibold">{t.label}</span><span className="text-xs text-muted">{t.desc}</span></span></button>)}
        </div>
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Configure ${edit?.name}`} footer={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        {edit && (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><div className="flex-1"><label className="label">Name</label><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div><label className="mt-5 flex items-center gap-2 text-sm"><Switch checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} /> Active</label></div>
            <div><label className="label">Create / match leads in board</label>
              <select className="input" value={edit.settings.leadBoard} onChange={(e) => setEdit({ ...edit, settings: { ...edit.settings, leadBoard: e.target.value } })}><option value="">— don&apos;t link to a board —</option>{boards.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}</select>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[var(--brand)]" checked={edit.settings.autoCreateLead} onChange={(e) => setEdit({ ...edit, settings: { ...edit.settings, autoCreateLead: e.target.checked } })} /> Create a new lead when the contact isn&apos;t found</label>
            {edit.type === "webchat" && (
              <>
                <div><label className="label">Greeting</label><input className="input" value={edit.settings.greeting} onChange={(e) => setEdit({ ...edit, settings: { ...edit.settings, greeting: e.target.value } })} /></div>
                <div><label className="label">Brand colour</label><input type="color" className="h-9 w-20 cursor-pointer rounded border border-border" value={edit.settings.color} onChange={(e) => setEdit({ ...edit, settings: { ...edit.settings, color: e.target.value } })} /></div>
              </>
            )}
            {edit.type === "email" && <div><label className="label">Reply-from address</label><input className="input" placeholder="support@yourcompany.com" value={edit.settings.fromEmail} onChange={(e) => setEdit({ ...edit, settings: { ...edit.settings, fromEmail: e.target.value } })} /><p className="mt-1 text-xs text-muted">Outgoing email needs <code>SMTP_URL</code> set on the server (e.g. smtps://user:pass@smtp.gmail.com).</p></div>}
            {(edit.type === "sms" || edit.type === "whatsapp") && (
              <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                <p className="text-xs font-semibold sm:col-span-2">Twilio (optional, for replies)</p>
                <input className="input" placeholder="Account SID (AC…)" value={edit.settings.twilioSid} onChange={(e) => setEdit({ ...edit, settings: { ...edit.settings, twilioSid: e.target.value } })} />
                <input className="input" placeholder="From number (+1…)" value={edit.settings.twilioFrom} onChange={(e) => setEdit({ ...edit, settings: { ...edit.settings, twilioFrom: e.target.value } })} />
                <input className="input sm:col-span-2" type="password" placeholder="Auth token (stored encrypted-at-rest by your DB, never shown again)" value={twToken} onChange={(e) => setTwToken(e.target.value)} />
              </div>
            )}
            {edit.type !== "webchat" && edit.type !== "email" && <div><label className="label">Outbound webhook (replies are POSTed here, signed)</label><input className="input" placeholder="https://your-gateway.com/send" value={edit.settings.outboundWebhookUrl} onChange={(e) => setEdit({ ...edit, settings: { ...edit.settings, outboundWebhookUrl: e.target.value } })} /></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
