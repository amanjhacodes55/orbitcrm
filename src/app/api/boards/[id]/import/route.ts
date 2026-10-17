import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { boardFor } from "@/lib/access";
import { Item, Activity } from "@/lib/models";
import { normaliseValues } from "@/lib/items";

/**
 * CSV import (rows already parsed in the browser). mapping: { csvHeader: columnId | "name" }.
 * Inserted in bulk (no per-row automations) — fast for thousands of rows.
 */
const Body = z.object({ rows: z.array(z.record(z.string())).min(1).max(5000), mapping: z.record(z.string()), group: z.string().optional() });

export const POST = route<{ id: string }>(async (req, ctx, { id }) => {
  const board = await boardFor(ctx, id);
  if (!board) return err("Board not found", 404);
  const p = Body.safeParse(await req.json());
  if (!p.success) return err("Invalid import (max 5000 rows)");
  const nameKey = Object.entries(p.data.mapping).find(([, v]) => v === "name")?.[0];
  if (!nameKey) return err("Map one CSV column to the item Name");
  const group = board.groups.find((g) => g.id === p.data.group)?.id || board.groups[0].id;
  const docs = p.data.rows
    .filter((r) => (r[nameKey] || "").trim())
    .map((r, i) => {
      const vals: Record<string, unknown> = {};
      for (const [h, cid] of Object.entries(p.data.mapping)) if (cid && cid !== "name") vals[cid] = r[h];
      return { workspace: board.workspace, board: board._id, group, name: r[nameKey].trim().slice(0, 200), values: normaliseValues(board.toObject() as never, vals), position: i, createdBy: ctx.user.id, source: "import" };
    });
  const created = await Item.insertMany(docs);
  await Activity.insertMany(created.map((c) => ({ workspace: board.workspace, board: board._id, item: c._id, type: "created", actor: ctx.user.id, text: "via CSV import" })));
  return json({ imported: created.length, skipped: p.data.rows.length - created.length });
});
