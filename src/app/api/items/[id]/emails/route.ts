import { route, err, json } from "@/lib/api";
import { itemFor } from "@/lib/access";
import { Channel, Conversation, Message } from "@/lib/models";
import { plain } from "@/lib/serialize";

/** Email threads linked to this item, newest first, each with its messages. */
export const GET = route<{ id: string }>(async (_req, ctx, { id }) => {
  const it = await itemFor(ctx, id);
  if (!it) return err("Item not found", 404);
  const chans = await Channel.find({ workspace: ctx.workspace.id, type: "email" }).select("_id").lean();
  const convs = await Conversation.find({ item: it._id, channel: { $in: chans.map((c) => c._id) } }).sort({ lastMessageAt: -1 }).limit(50).lean();
  const msgs = await Message.find({ conversation: { $in: convs.map((c) => c._id) } }).sort({ createdAt: 1 }).populate("author", "name image").lean();
  const threads = convs.map((c) => ({ ...c, messages: msgs.filter((m) => String(m.conversation) === String(c._id)) }));
  return json({ threads: plain(threads), smtp: !!process.env.SMTP_URL });
});
