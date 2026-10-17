import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { boardFor } from "@/lib/access";
import { Item } from "@/lib/models";
import { deleteItem, updateItem } from "@/lib/items";

const Body = z.object({ ids: z.array(z.string()).min(1).max(500), action: z.enum(["delete", "set", "move", "duplicate"]), column: z.string().optional(), value: z.unknown().optional(), group: z.string().optional() });

/** Bulk actions on selected items (each change still logs activity and fires automations/webhooks). */
export const POST = route<{ id: string }>(async (req, ctx, { id }) => {
  const board = await boardFor(ctx, id);
  if (!board) return err("Board not found", 404);
  const p = Body.safeParse(await req.json());
  if (!p.success) return err("Invalid bulk request");
  const items = await Item.find({ _id: { $in: p.data.ids }, board: board._id }).select("_id name group values").lean();
  const actor = { userId: ctx.user.id, source: "web" };
  let done = 0;
  for (const it of items) {
    if (p.data.action === "delete") await deleteItem(String(it._id), actor);
    else if (p.data.action === "move") await updateItem(String(it._id), { group: p.data.group }, actor);
    else if (p.data.action === "set" && p.data.column) await updateItem(String(it._id), { values: { [p.data.column]: p.data.value ?? null } }, actor, { raw: true });
    else if (p.data.action === "duplicate") {
      const { createItem } = await import("@/lib/items");
      await createItem(board.toObject() as never, { name: `${it.name} (copy)`, group: it.group, values: it.values as Record<string, unknown> }, actor);
    }
    done++;
  }
  return json({ done });
});
