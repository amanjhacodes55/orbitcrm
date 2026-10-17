import { route, err, json } from "@/lib/api";
import { boardFor } from "@/lib/access";
import { Item } from "@/lib/models";

/** Item picker / name resolver for relation columns: ?q=search or ?ids=a,b,c */
export const GET = route<{ id: string }>(async (req, ctx, { id }) => {
  const board = await boardFor(ctx, id);
  if (!board) return err("Board not found", 404);
  const u = new URL(req.url);
  const ids = (u.searchParams.get("ids") || "").split(",").filter((x) => /^[a-f0-9]{24}$/.test(x)).slice(0, 100);
  const q = (u.searchParams.get("q") || "").trim();
  const filter: Record<string, unknown> = { board: board._id };
  if (ids.length) filter._id = { $in: ids };
  else if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const items = await Item.find(filter).select("name").sort({ updatedAt: -1 }).limit(ids.length ? 100 : 20).lean();
  return json({ board: { id: String(board._id), name: board.name, icon: board.icon }, items: items.map((i) => ({ id: String(i._id), name: i.name })) });
});
