import { route, json } from "@/lib/api";
import { Notification } from "@/lib/models";

export const GET = route(async (_req, ctx) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: ctx.user.id }).sort({ createdAt: -1 }).limit(20).lean(),
    Notification.countDocuments({ user: ctx.user.id, read: false }),
  ]);
  return json({ unread, items: items.map((n) => ({ id: String(n._id), text: n.text, link: n.link, read: n.read, createdAt: n.createdAt })) });
}, { noWorkspace: true });
export const POST = route(async (_req, ctx) => {
  await Notification.updateMany({ user: ctx.user.id, read: false }, { read: true });
  return json({ ok: true });
}, { noWorkspace: true });
