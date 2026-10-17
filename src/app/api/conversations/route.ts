import { route, json } from "@/lib/api";
import { Conversation } from "@/lib/models";
import { plain } from "@/lib/serialize";

/** ?status=open|pending|closed|all &channel=<id> &mine=1 &q=search */
export const GET = route(async (req, ctx) => {
  const u = new URL(req.url);
  const q: Record<string, unknown> = { workspace: ctx.workspace.id };
  const status = u.searchParams.get("status") || "open";
  if (status !== "all") q.status = status;
  if (u.searchParams.get("channel")) q.channel = u.searchParams.get("channel");
  if (u.searchParams.get("mine")) q.assignee = ctx.user.id;
  const s = (u.searchParams.get("q") || "").trim();
  if (s) {
    const re = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    q.$or = [{ "contact.name": re }, { "contact.email": re }, { "contact.phone": re }, { lastMessage: re }, { subject: re }];
  }
  const [list, counts] = await Promise.all([
    Conversation.find(q).sort({ lastMessageAt: -1 }).limit(100).populate("channel", "name type").populate("assignee", "name image").lean(),
    Conversation.aggregate([{ $match: { workspace: (await import("mongoose")).Types.ObjectId.createFromHexString(ctx.workspace.id) } }, { $group: { _id: "$status", n: { $sum: 1 }, unread: { $sum: "$unread" } } }]),
  ]);
  return json({ conversations: plain(list), counts: Object.fromEntries(counts.map((c) => [c._id, { n: c.n, unread: c.unread }])) });
});
