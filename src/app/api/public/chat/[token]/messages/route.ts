import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { rateLimit } from "@/lib/api";
import { Conversation, Message, Workspace } from "@/lib/models";
import { activeChannel, cors, pjson } from "@/lib/publicChannel";
import { ingestInbound } from "@/lib/inbox";
import { sha256 } from "@/lib/ids";

export function OPTIONS() { return new Response(null, { headers: cors }); }

async function auth(token: string, conversationId: string, visitorToken: string) {
  const ch = await activeChannel(token, "webchat");
  if (!ch || !/^[a-f0-9]{24}$/.test(conversationId)) return null;
  const conv = await Conversation.findOne({ _id: conversationId, channel: ch._id }).select("+visitorTokenHash").lean();
  if (!conv || conv.visitorTokenHash !== sha256(visitorToken || "")) return null;
  return { ch, conv };
}

/** Widget polls: ?c=<conversationId>&v=<visitorToken>&after=<iso> */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await dbConnect();
  const u = new URL(req.url);
  const a = await auth(token, u.searchParams.get("c") || "", u.searchParams.get("v") || "");
  if (!a) return pjson({ error: "Session expired" }, 401);
  const after = u.searchParams.get("after");
  const q: Record<string, unknown> = { conversation: a.conv._id, direction: { $in: ["in", "out"] } };
  if (after && !isNaN(Date.parse(after))) q.createdAt = { $gt: new Date(after) };
  const msgs = await Message.find(q).sort({ createdAt: 1 }).limit(200).lean();
  const ws = await Workspace.findById(a.ch.workspace).select("name").lean();
  // Visitors see the agent's first name, or the company name for automated replies (never internal labels).
  const shown = (m: { author?: unknown; authorLabel?: string | null }) => (m.author ? (m.authorLabel || "").split(" ")[0] || ws?.name || "Support" : ws?.name || "Support");
  return pjson({ status: a.conv.status, messages: msgs.map((m) => ({ id: String(m._id), from: m.direction === "in" ? "visitor" : "agent", author: m.direction === "out" ? shown(m) : "", text: m.text, at: m.createdAt })) });
}

/** Visitor sends a follow-up: { c, v, text } */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await dbConnect();
  const p = z.object({ c: z.string(), v: z.string(), text: z.string().trim().min(1).max(4000) }).safeParse(await req.json().catch(() => ({})));
  if (!p.success) return pjson({ error: "Message is empty" }, 400);
  if (!rateLimit(`chatmsg:${p.data.c}`, 30, 60_000)) return pjson({ error: "Slow down" }, 429);
  const a = await auth(token, p.data.c, p.data.v);
  if (!a) return pjson({ error: "Session expired" }, 401);
  await ingestInbound(a.ch as never, { text: p.data.text }, String(a.conv._id));
  return pjson({ ok: true });
}
