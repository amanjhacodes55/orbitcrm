import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { rateLimit } from "@/lib/api";
import { Conversation } from "@/lib/models";
import { activeChannel, cors, pjson } from "@/lib/publicChannel";
import { ingestInbound } from "@/lib/inbox";
import { sha256, token as mkToken } from "@/lib/ids";

export function OPTIONS() { return new Response(null, { headers: cors }); }

/** Visitor starts a chat from the website widget: { name, email, text } → { conversationId, visitorToken } */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!rateLimit(`chatstart:${req.headers.get("x-forwarded-for") || "l"}`, 10, 600_000)) return pjson({ error: "Too many chats, try later" }, 429);
  await dbConnect();
  const ch = await activeChannel(token, "webchat");
  if (!ch) return pjson({ error: "Chat is offline" }, 404);
  const p = z.object({ name: z.string().trim().min(1).max(80), email: z.string().trim().email().max(200).optional().or(z.literal("")), text: z.string().trim().min(1).max(4000) }).safeParse(await req.json().catch(() => ({})));
  if (!p.success) return pjson({ error: "Please enter your name and a message" }, 400);
  const visitor = mkToken("vis", 18);
  const { conv } = await ingestInbound(ch as never, { name: p.data.name, email: p.data.email || "", text: p.data.text, key: p.data.email ? "" : `visitor:${visitor.slice(-12)}` });
  await Conversation.updateOne({ _id: conv._id }, { visitorTokenHash: sha256(visitor) });
  return pjson({ conversationId: String(conv._id), visitorToken: visitor });
}
