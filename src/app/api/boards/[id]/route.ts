import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { Automation, Activity, Item } from "@/lib/models";
import { boardFor, memberMap } from "@/lib/access";
import { COLUMN_TYPES } from "@/lib/models";
import { plain } from "@/lib/serialize";

type P = { id: string };

export const GET = route<P>(async (_req, ctx, { id }) => {
  const board = await boardFor(ctx, id);
  if (!board) return err("Board not found", 404);
  const items = await Item.find({ board: board._id }).sort({ position: 1, createdAt: 1 }).lean();
  return json({ board: plain(board.toObject()), items: plain(items), members: await memberMap(ctx.workspace.id) });
});

const Opt = z.object({ id: z.string(), label: z.string().max(40), color: z.string().max(20) });
const Col = z.object({ id: z.string(), title: z.string().trim().min(1).max(60), type: z.enum(COLUMN_TYPES), width: z.number().min(80).max(600).optional(), options: z.array(Opt).max(40).optional(), relationBoard: z.string().optional() });
const View = z.object({
  id: z.string().max(40), name: z.string().trim().min(1).max(60), type: z.enum(["table", "kanban", "calendar"]),
  filters: z.array(z.object({ column: z.string(), op: z.string(), value: z.unknown().optional() })).max(20).default([]),
  match: z.enum(["all", "any"]).default("all"),
  sort: z.object({ column: z.string().default(""), dir: z.enum(["asc", "desc"]).default("asc") }).default({ column: "", dir: "asc" }),
  hidden: z.array(z.string()).max(60).default([]),
  kanbanColumn: z.string().default(""), dateColumn: z.string().default(""),
});
const Grp = z.object({ id: z.string(), title: z.string().trim().min(1).max(60), color: z.string(), collapsed: z.boolean().optional() });
const Patch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  icon: z.string().max(8).optional(),
  description: z.string().max(500).optional(),
  columns: z.array(Col).max(40).optional(),
  groups: z.array(Grp).min(1).max(30).optional(),
  kanbanColumn: z.string().optional(),
  views: z.array(View).max(30).optional(),
});

export const PATCH = route<P>(async (req, ctx, { id }) => {
  const board = await boardFor(ctx, id);
  if (!board) return err("Board not found", 404);
  const p = Patch.safeParse(await req.json());
  if (!p.success) return err(p.error.issues[0].message);
  const removedGroups = p.data.groups ? board.groups.filter((g) => !p.data.groups!.some((x) => x.id === g.id)).map((g) => g.id) : [];
  board.set(p.data);
  await board.save();
  if (removedGroups.length) {
    const fallback = board.groups[0].id;
    await Item.updateMany({ board: board._id, group: { $in: removedGroups } }, { group: fallback });
  }
  return json({ board: plain(board.toObject()) });
});

export const DELETE = route<P>(async (_req, ctx, { id }) => {
  const board = await boardFor(ctx, id);
  if (!board) return err("Board not found", 404);
  await Promise.all([Item.deleteMany({ board: board._id }), Activity.deleteMany({ board: board._id }), Automation.deleteMany({ board: board._id })]);
  await board.deleteOne();
  return json({ ok: true });
}, { wsAdmin: true });
