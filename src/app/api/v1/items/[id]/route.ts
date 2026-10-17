import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { v1, apiErr } from "@/lib/publicApi";
import { Board, Item } from "@/lib/models";
import { deleteItem, updateItem } from "@/lib/items";
import { publicItem } from "@/lib/events";

type P = { id: string };
const find = (ws: string, id: string) => (isValidObjectId(id) ? Item.findOne({ _id: id, workspace: ws }).lean() : null);

export const GET = v1<P>("items.read", async (_req, ctx, { id }) => {
  const it = await find(ctx.workspace, id);
  if (!it) return apiErr("Item not found", 404);
  const b = await Board.findById(it.board).lean();
  return NextResponse.json({ item: publicItem(b as never, it as never) });
});

export const PATCH = v1<P>("items.write", async (req, ctx, { id }) => {
  const it = await find(ctx.workspace, id);
  if (!it) return apiErr("Item not found", 404);
  const p = z.object({ name: z.string().max(200).optional(), group: z.string().optional(), values: z.record(z.unknown()).optional() }).safeParse(await req.json());
  if (!p.success) return apiErr("Invalid body");
  const { item, changes } = await updateItem(String(it._id), p.data, { label: ctx.label, source: ctx.app ? `app:${ctx.app.slug}` : "api" });
  const b = await Board.findById(it.board).lean();
  return NextResponse.json({ item: publicItem(b as never, item.toObject() as never), changes });
});

export const DELETE = v1<P>("items.write", async (_req, ctx, { id }) => {
  const it = await find(ctx.workspace, id);
  if (!it) return apiErr("Item not found", 404);
  await deleteItem(String(it._id), { label: ctx.label, source: "api" });
  return NextResponse.json({ deleted: true });
});
