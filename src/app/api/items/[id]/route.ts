import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { itemFor } from "@/lib/access";
import { deleteItem, updateItem } from "@/lib/items";
import { plain } from "@/lib/serialize";

type P = { id: string };
const Patch = z.object({ name: z.string().max(200).optional(), group: z.string().optional(), position: z.number().optional(), values: z.record(z.unknown()).optional() });

export const PATCH = route<P>(async (req, ctx, { id }) => {
  const it = await itemFor(ctx, id);
  if (!it) return err("Item not found", 404);
  const p = Patch.safeParse(await req.json());
  if (!p.success) return err("Invalid update");
  // values from the UI are already in stored form (option ids, user ids …)
  const { item } = await updateItem(String(it._id), p.data, { userId: ctx.user.id, source: "web" }, { raw: true });
  return json({ item: plain(item.toObject()) });
});

export const DELETE = route<P>(async (_req, ctx, { id }) => {
  const it = await itemFor(ctx, id);
  if (!it) return err("Item not found", 404);
  await deleteItem(String(it._id), { userId: ctx.user.id, source: "web" });
  return json({ ok: true });
});
