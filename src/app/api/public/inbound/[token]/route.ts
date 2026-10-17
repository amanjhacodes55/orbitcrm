import { dbConnect } from "@/lib/db";
import { rateLimit } from "@/lib/api";
import { activeChannel, cors, pjson } from "@/lib/publicChannel";
import { ingestInbound, type Inbound } from "@/lib/inbox";

export function OPTIONS() { return new Response(null, { headers: cors }); }

/**
 * Inbound messages for email / SMS / WhatsApp / custom channels.
 * Accepts: our JSON { from|email|phone, name, text, subject },
 *          Twilio SMS/WhatsApp form posts (From, Body, ProfileName),
 *          email-provider parse webhooks (from, subject, text | stripped-text | TextBody | plain).
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!rateLimit(`inbound:${token}`, 120, 60_000)) return pjson({ error: "Rate limited" }, 429);
  await dbConnect();
  const ch = await activeChannel(token);
  if (!ch || ch.type === "webchat") return pjson({ error: "Unknown channel" }, 404);
  const ct = req.headers.get("content-type") || "";
  let b: Record<string, string> = {};
  try {
    b = ct.includes("json") ? await req.json() : (Object.fromEntries((await req.formData()).entries()) as Record<string, string>);
  } catch {
    return pjson({ error: "Body must be JSON or form data" }, 400);
  }
  const fromRaw = String(b.From || b.from || b.sender || b.email || b.phone || "");
  const emailMatch = fromRaw.match(/[^\s<>"]+@[^\s<>"]+/);
  const isEmail = ch.type === "email" || !!emailMatch;
  const msg: Inbound = {
    name: String(b.ProfileName || b.name || (fromRaw.includes("<") ? fromRaw.split("<")[0].replace(/"/g, "").trim() : "")),
    email: isEmail ? (emailMatch?.[0] || String(b.email || "")) : String(b.email || ""),
    phone: !isEmail ? fromRaw.replace(/^whatsapp:/, "") : String(b.phone || ""),
    subject: String(b.subject || b.Subject || ""),
    text: String(b.Body || b.text || b["stripped-text"] || b.TextBody || b.plain || b.message || b.body || ""),
  };
  if (!msg.email && !msg.phone) return pjson({ error: "Provide a sender (from / email / phone)" }, 400);
  if (!msg.text.trim()) return pjson({ error: "Message text is empty" }, 400);
  const { conv, isNew } = await ingestInbound(ch as never, msg);
  // Twilio expects TwiML or empty 200
  if (b.From && b.Body) return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml", ...cors } });
  return pjson({ ok: true, conversation_id: String(conv._id), new_conversation: isNew, lead_id: conv.item ? String(conv.item) : null });
}
