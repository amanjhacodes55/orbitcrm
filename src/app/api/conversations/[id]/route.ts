import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { Board, Channel, Conversation, Item, Message } from "@/lib/models";
import { createItem } from "@/lib/items";
import { plain } from "@/lib/serialize";

type P = { id: string };
const find = (ws: string, id: string) => (isValidObjectId(id) ? Conversation.findOne({ _id: id, workspace: ws }) : null);

export const GET = route<P>(async (_req, ctx, { id }) => {
  const c = await find(ctx.workspace.id, id);
  if (!c) return err("Not found", 404);
  if (c.unread) { c.unread = 0; await c.save(); }
  const [messages, channel, item] = await Promise.all([
    Message.find({ conversation: c._id }).sort({ createdAt: 1 }).limit(500).populate("author", "name image").lean(),
    Channel.findById(c.channel).select("name type token settings").lean(),
    c.item ? Item.findById(c.item).select("name board values").lean() : null,
  ]);
  return json({ conversation: plain(c.toObject()), messages: plain(messages), channel: plain(channel), item: plain(item) });
});

const Patch = z.object({ status: z.enum(["open", "pending", "closed"]).optional(), assignee: z.string().nullable().optional(), linkItem: z.string().nullable().optional(), createLead: z.boolean().optional(), contact: z.object({ name: z.string().max(100), email: z.string().max(200), phone: z.string().max(40) }).partial().optional() });

export const PATCH = route<P>(async (req, ctx, { id }) => {
  const c = await find(ctx.workspace.id, id);
  if (!c) return err("Not found", 404);
  const p = Patch.safeParse(await req.json());
  if (!p.success) return err("Invalid update");
  if (p.data.status) c.status = p.data.status;
  if (p.data.assignee !== undefined) c.assignee = (p.data.assignee || undefined) as never;
  if (p.data.contact) for (const [k, v] of Object.entries(p.data.contact)) c.set(`contact.${k}`, v);
  if (p.data.linkItem !== undefined) {
    const it = p.data.linkItem ? await Item.findOne({ _id: p.data.linkItem, workspace: ctx.workspace.id }).lean() : null;
    c.item = (it?._id || undefined) as never;
    c.board = (it?.board || undefined) as never;
  }
  if (p.data.createLead && !c.item) {
    const ch = await Channel.findById(c.channel).lean();
    const board = (ch?.settings?.leadBoard && (await Board.findOne({ _id: ch.settings.leadBoard, workspace: ctx.workspace.id }).lean().catch(() => null))) || (await Board.findOne({ workspace: ctx.workspace.id, kind: "leads" }).lean());
    if (!board) return err("No leads board to create the lead in");
    const values: Record<string, unknown> = {};
    const e = board.columns.find((x) => x.type === "email"), ph = board.columns.find((x) => x.type === "phone");
    if (e && c.contact?.email) values[e.id] = c.contact.email;
    if (ph && c.contact?.phone) values[ph.id] = c.contact.phone;
    const it = await createItem(board as never, { name: c.contact?.name || c.contact?.email || c.contact?.phone || "New lead", values }, { userId: ctx.user.id, source: "inbox" });
    c.item = it._id as never;
    c.board = board._id as never;
  }
  await c.save();
  return json({ conversation: plain(c.toObject()) });
});
