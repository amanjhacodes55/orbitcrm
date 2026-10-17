import { z } from "zod";
import { route, err, json, rateLimit } from "@/lib/api";
import { boardFor } from "@/lib/access";
import { createItem } from "@/lib/items";
import { plain } from "@/lib/serialize";

export const POST = route<{ id: string }>(async (req, ctx, { id }) => {
  if (!rateLimit(`item:${ctx.user.id}`, 120, 60_000)) return err("Slow down", 429);
  const board = await boardFor(ctx, id);
  if (!board) return err("Board not found", 404);
  const p = z.object({ name: z.string().trim().min(1).max(200), group: z.string().optional(), values: z.record(z.unknown()).optional() }).safeParse(await req.json());
  if (!p.success) return err("Item name is required");
  const item = await createItem(board.toObject() as never, p.data, { userId: ctx.user.id, source: "web" });
  return json({ item: plain(item.toObject()) });
});
