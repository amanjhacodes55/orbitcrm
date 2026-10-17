import "server-only";
import { Activity, Board, Channel, Conversation, Item, Message, Notification, Workspace } from "@/lib/models";
import { createItem } from "@/lib/items";
import { outboundFetch } from "@/lib/outbound";
import { sign } from "@/lib/events";

type ChannelDoc = { _id: unknown; workspace: unknown; type: string; name: string; settings: Record<string, unknown> };
export type Inbound = { name?: string; email?: string; phone?: string; text: string; subject?: string; key?: string };

const norm = (s?: string) => (s || "").trim();
export const contactKey = (c: { email?: string; phone?: string; key?: string }) =>
  norm(c.key) || norm(c.email).toLowerCase() || norm(c.phone).replace(/[^\d+]/g, "");

/** Find an existing lead by email/phone in the channel's board, or create one. */
async function linkLead(ch: ChannelDoc, c: { name?: string; email?: string; phone?: string }, source: string) {
  const boardId = String(ch.settings.leadBoard || "");
  if (!boardId) return null;
  const board = await Board.findOne({ _id: boardId, workspace: ch.workspace }).lean().catch(() => null);
  if (!board) return null;
  const emailCol = board.columns.find((x) => x.type === "email");
  const phoneCol = board.columns.find((x) => x.type === "phone");
  const or: Record<string, unknown>[] = [];
  if (c.email && emailCol) or.push({ [`values.${emailCol.id}`]: new RegExp(`^${c.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  if (c.phone && phoneCol) or.push({ [`values.${phoneCol.id}`]: c.phone });
  const existing = or.length ? await Item.findOne({ board: board._id, $or: or }).lean() : null;
  if (existing) return { item: existing._id, board: board._id };
  if (!ch.settings.autoCreateLead) return null;
  const values: Record<string, unknown> = {};
  if (emailCol && c.email) values[emailCol.id] = c.email;
  if (phoneCol && c.phone) values[phoneCol.id] = c.phone;
  const src = board.columns.find((x) => x.title.toLowerCase() === "source");
  if (src) values[src.id] = source;
  const it = await createItem(board as never, { name: c.name || c.email || c.phone || "New contact", values }, { label: `${ch.name} channel`, source: `channel:${ch.type}` });
  return { item: it._id, board: board._id };
}

async function logOnItem(conv: { workspace: unknown; item?: unknown; board?: unknown }, text: string, data: Record<string, unknown>, actorLabel: string, actor?: string) {
  if (!conv.item) return;
  await Activity.create({ workspace: conv.workspace, board: conv.board, item: conv.item, type: "message", actor, actorLabel, text: text.slice(0, 2000), data });
}

/** A customer message arrived on a channel (webchat, email, SMS, WhatsApp, custom webhook). */
export async function ingestInbound(ch: ChannelDoc, msg: Inbound, convId?: string) {
  const key = contactKey(msg);
  let conv = convId ? await Conversation.findOne({ _id: convId, channel: ch._id }) : key ? await Conversation.findOne({ channel: ch._id, "contact.key": key }).sort({ lastMessageAt: -1 }) : null;
  const isNew = !conv;
  if (!conv) {
    conv = new Conversation({ workspace: ch.workspace, channel: ch._id, contact: { name: norm(msg.name), email: norm(msg.email), phone: norm(msg.phone), key }, subject: norm(msg.subject).slice(0, 200) });
    const link = await linkLead(ch, msg, ch.type === "webchat" ? "Website" : ch.type === "email" ? "Email" : ch.type === "whatsapp" ? "WhatsApp" : ch.type === "sms" ? "SMS" : ch.name);
    if (link) { conv.item = link.item as never; conv.board = link.board as never; }
  } else {
    if (msg.name && !conv.contact?.name) conv.set("contact.name", norm(msg.name));
    if (msg.email && !conv.contact?.email) conv.set("contact.email", norm(msg.email));
    if (msg.phone && !conv.contact?.phone) conv.set("contact.phone", norm(msg.phone));
  }
  const text = norm(msg.text).slice(0, 10000) || "(empty message)";
  conv.lastMessage = text.slice(0, 200);
  conv.lastMessageAt = new Date();
  conv.unread = (conv.unread || 0) + 1;
  if (conv.status === "closed") conv.status = "open";
  await conv.save();
  const m = await Message.create({ workspace: ch.workspace, conversation: conv._id, direction: "in", authorLabel: conv.contact?.name || conv.contact?.email || conv.contact?.phone || "Visitor", text });
  await logOnItem(conv, text, { channel: ch.type, direction: "in", conversation: String(conv._id) }, `${conv.contact?.name || "Customer"} via ${ch.name}`);
  // notify: assignee, or all admins for a brand-new conversation
  const ws = await Workspace.findById(ch.workspace).select("members").lean();
  const targets = conv.assignee ? [conv.assignee] : isNew ? (ws?.members || []).filter((x) => x.role !== "member").map((x) => x.user) : [];
  if (targets.length) await Notification.insertMany(targets.map((u) => ({ user: u, workspace: ch.workspace, text: `💬 ${conv!.contact?.name || "Someone"} on ${ch.name}: ${text.slice(0, 80)}`, link: `/app/inbox?c=${conv!._id}` })));
  // automations: "When a message is received"
  try {
    const { runMessageAutomations } = await import("@/lib/automation");
    await runMessageAutomations(ch, conv.toObject() as never, { text, isNew });
  } catch (e) {
    console.error("message automation error", e);
  }
  return { conv, message: m, isNew };
}

/** Deliver an agent (or automation) reply through the conversation's channel. */
export async function sendReply(convId: string, text: string, by: { userId?: string; label: string }) {
  const conv = await Conversation.findById(convId);
  if (!conv) throw new Error("Conversation not found");
  const ch = await Channel.findById(conv.channel).select("+twilioToken +signingSecret").lean();
  if (!ch) throw new Error("Channel not found");
  let delivery = "stored";
  try {
    delivery = await deliver(ch as never, conv.toObject() as never, text);
  } catch (e) {
    delivery = `failed: ${e instanceof Error ? e.message : String(e)}`;
  }
  const m = await Message.create({ workspace: conv.workspace, conversation: conv._id, direction: "out", author: by.userId, authorLabel: by.label, text, delivery });
  conv.lastMessage = text.slice(0, 200);
  conv.lastMessageAt = new Date();
  conv.unread = 0;
  if (conv.status === "open") conv.status = "pending";
  await conv.save();
  await logOnItem(conv, text, { channel: ch.type, direction: "out", conversation: String(conv._id) }, by.userId ? "" : by.label, by.userId);
  return m;
}

async function deliver(ch: ChannelDoc & { twilioToken?: string; signingSecret?: string }, conv: { contact: { email?: string; phone?: string; name?: string }; subject?: string; _id: unknown }, text: string) {
  if (ch.type === "webchat") return "sent"; // the visitor's widget polls for new messages
  const s = ch.settings as Record<string, string>;
  if (ch.type === "email") {
    if (!conv.contact.email) throw new Error("Contact has no email address");
    if (!process.env.SMTP_URL) throw new Error("SMTP not configured (set SMTP_URL)");
    const nodemailer = await import("nodemailer");
    const t = nodemailer.createTransport(process.env.SMTP_URL);
    await t.sendMail({ from: s.fromEmail || process.env.SMTP_FROM || "OrbitCRM <no-reply@orbitcrm.local>", to: conv.contact.email, subject: conv.subject ? `Re: ${conv.subject}` : "Re: your message", text });
    return "sent";
  }
  if ((ch.type === "sms" || ch.type === "whatsapp") && s.twilioSid && ch.twilioToken && s.twilioFrom) {
    if (!conv.contact.phone) throw new Error("Contact has no phone number");
    const pre = ch.type === "whatsapp" ? "whatsapp:" : "";
    const body = new URLSearchParams({ To: pre + conv.contact.phone.replace(/^whatsapp:/, ""), From: pre + s.twilioFrom.replace(/^whatsapp:/, ""), Body: text });
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${s.twilioSid}/Messages.json`, { method: "POST", headers: { Authorization: "Basic " + Buffer.from(`${s.twilioSid}:${ch.twilioToken}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`Twilio HTTP ${r.status}`);
    return "sent";
  }
  if (s.outboundWebhookUrl) {
    const body = JSON.stringify({ event: "message.outbound", channel: { id: String(ch._id), type: ch.type, name: ch.name }, conversation_id: String(conv._id), to: conv.contact, text });
    const r = await outboundFetch(s.outboundWebhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "X-Orbit-Signature": sign(ch.signingSecret || "", body) }, body });
    if (!r.ok) throw new Error(`Webhook HTTP ${r.status}`);
    return "sent";
  }
  throw new Error("No outbound delivery configured for this channel (add Twilio credentials or an outbound webhook URL)");
}
