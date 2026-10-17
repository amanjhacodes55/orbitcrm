import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { Board, Item, Types } from "@/lib/models";
import { TEMPLATES } from "@/lib/templates";

export const GET = route(async (_req, ctx) => {
  const boards = await Board.find({ workspace: ctx.workspace.id }).sort({ position: 1, createdAt: 1 }).select("name icon kind").lean();
  const counts = await Item.aggregate([{ $match: { workspace: new Types.ObjectId(ctx.workspace.id) } }, { $group: { _id: "$board", n: { $sum: 1 } } }]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  return json({ boards: boards.map((b) => ({ id: String(b._id), name: b.name, icon: b.icon, kind: b.kind, count: byId.get(String(b._id)) || 0 })) });
});

export const POST = route(async (req, ctx) => {
  const p = z.object({ template: z.enum(["leads", "deals", "contacts", "companies", "custom"]), name: z.string().trim().max(80).optional() }).safeParse(await req.json());
  if (!p.success) return err("Invalid request");
  const t = TEMPLATES[p.data.template];
  const n = await Board.countDocuments({ workspace: ctx.workspace.id });
  if (n >= 50) return err("Board limit reached (50).");
  const b = await Board.create({ workspace: ctx.workspace.id, name: p.data.name || t.name, icon: t.icon, kind: t.kind, itemLabel: t.itemLabel, description: t.description, position: n, ...t.build() });
  return json({ id: String(b._id) });
});
