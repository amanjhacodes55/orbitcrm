import { z } from "zod";
import { route, err, json, rateLimit } from "@/lib/api";
import { itemFor } from "@/lib/access";
import { sendEmail } from "@/lib/inbox";
import { plain } from "@/lib/serialize";

const emails = z.string().max(500).refine((s) => s.split(/[,;]\s*/).filter(Boolean).every((x) => z.string().email().safeParse(x.trim()).success), "Invalid email address");
const Body = z.object({ to: z.string().trim().email("Invalid recipient email"), cc: emails.optional().default(""), subject: z.string().trim().max(200).default(""), text: z.string().trim().min(1, "Write a message").max(10000), itemId: z.string().optional(), name: z.string().max(100).optional() });

/** Compose a new email (optionally linked to a CRM item). Creates a thread in the Inbox. */
export const POST = route(async (req, ctx) => {
  if (!rateLimit(`email:${ctx.user.id}`, 30, 60_000)) return err("Slow down", 429);
  const p = Body.safeParse(await req.json());
  if (!p.success) return err(p.error.issues[0]?.message || "Invalid email");
  const it = p.data.itemId ? await itemFor(ctx, p.data.itemId) : null;
  if (p.data.itemId && !it) return err("Item not found", 404);
  const { conv, message } = await sendEmail({ workspace: ctx.workspace.id, to: p.data.to, cc: p.data.cc, subject: p.data.subject, text: p.data.text, name: p.data.name || (it ? it.name : ""), item: it, by: { userId: ctx.user.id, label: ctx.user.name } });
  return json({ conversation: plain(conv.toObject()), message: plain(message.toObject()) });
});
