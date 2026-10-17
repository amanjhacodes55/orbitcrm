import { Types } from "mongoose";
import { route, json } from "@/lib/api";
import { App, Automation, Board, Item } from "@/lib/models";

/** Global search (Ctrl/Cmd+K): items (name + any text field), boards, automations, apps. */
export const GET = route(async (req, ctx) => {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return json({ items: [], boards: [], automations: [], apps: [] });
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const ws = new Types.ObjectId(ctx.workspace.id);
  const [items, boards, autos, apps] = await Promise.all([
    Item.aggregate([
      { $match: { workspace: ws } },
      { $addFields: { _vals: { $objectToArray: "$values" } } },
      { $match: { $or: [{ name: re }, { "_vals.v": re }] } },
      { $sort: { updatedAt: -1 } },
      { $limit: 15 },
      { $project: { name: 1, board: 1, _vals: 1 } },
    ]),
    Board.find({ workspace: ws, name: re }).select("name icon").limit(5).lean(),
    Automation.find({ workspace: ws, name: re }).select("name").limit(5).lean(),
    App.find({ status: "approved", name: re }).select("name icon slug").limit(5).lean(),
  ]);
  const bmap = new Map((await Board.find({ _id: { $in: items.map((i) => i.board) } }).select("name icon").lean()).map((b) => [String(b._id), b]));
  return json({
    items: items.map((i) => {
      const hit = re.test(i.name) ? "" : String((i._vals as { v: unknown }[]).find((x) => re.test(String(x.v)))?.v ?? "");
      const b = bmap.get(String(i.board));
      return { id: String(i._id), name: i.name, board: String(i.board), boardName: b?.name, icon: b?.icon, match: hit.slice(0, 60) };
    }),
    boards: boards.map((b) => ({ id: String(b._id), name: b.name, icon: b.icon })),
    automations: autos.map((a) => ({ id: String(a._id), name: a.name })),
    apps: apps.map((a) => ({ slug: a.slug, name: a.name, icon: a.icon })),
  });
});
