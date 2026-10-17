import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { route, err, json, rateLimit } from "@/lib/api";
import { Conversation, Message } from "@/lib/models";
import { sendReply } from "@/lib/inbox";
import { plain } from "@/lib/serialize";

/** Agent reply ({ text }) or internal note ({ text, note: true } — never sent to the customer). */
export const POST = route<{ id: string }>(async (req, ctx, { id }) => {
  if (!rateLimit(`reply:${ctx.user.id}`, 60, 60_000)) return err("Slow down", 429);
  const c = isValidObjectId(id) ? await Conversation.findOne({ _id: id, workspace: ctx.workspace.id }) : null;
  if (!c) return err("Not found", 404);
  const p = z.object({ text: z.string().trim().min(1).max(10000), note: z.boolean().optional(), cc: z.string().max(500).optional() }).safeParse(await req.json());
  if (!p.success) return err("Message is empty");
  if (p.data.note) {
    const m = await Message.create({ workspace: c.workspace, conversation: c._id, direction: "note", author: ctx.user.id, authorLabel: ctx.user.name, text: p.data.text, delivery: "internal" });
    return json({ message: plain(m.toObject()) });
  }
  const m = await sendReply(String(c._id), p.data.text, { userId: ctx.user.id, label: ctx.user.name }, { cc: p.data.cc });
  if (!c.assignee) await Conversation.updateOne({ _id: c._id }, { assignee: ctx.user.id });
  return json({ message: plain(m.toObject()) });
});
