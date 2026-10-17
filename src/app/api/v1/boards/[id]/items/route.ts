import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { v1, apiErr } from "@/lib/publicApi";
import { Board, Item } from "@/lib/models";
import { createItem } from "@/lib/items";
import { publicItem } from "@/lib/events";
import { findColumn, coerceValue, type Col } from "@/lib/values";

type P = { id: string };
const board = (ws: string, id: string) => (isValidObjectId(id) ? Board.findOne({ workspace: ws, _id: id }).lean() : null);

/** GET ?limit=50&cursor=<id>&search=text&field=Email&value=a@b.com */
export const GET = v1<P>("items.read", async (req, ctx, { id }) => {
  const b = await board(ctx.workspace, id);
  if (!b) return apiErr("Board not found", 404);
  const u = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(u.searchParams.get("limit") || 50)));
  const q: Record<string, unknown> = { board: b._id };
  const cursor = u.searchParams.get("cursor");
  if (cursor && isValidObjectId(cursor)) q._id = { $gt: cursor };
  const search = u.searchParams.get("search");
  if (search) q.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const field = u.searchParams.get("field");
  if (field) {
    const col = findColumn(b.columns as unknown as Col[], field);
    if (!col) return apiErr(`Unknown field “${field}”`);
    q[`values.${col.id}`] = coerceValue(col, u.searchParams.get("value"));
  }
  const items = await Item.find(q).sort({ _id: 1 }).limit(limit + 1).lean();
  const page = items.slice(0, limit);
  return NextResponse.json({ items: page.map((it) => publicItem(b as never, it as never)), next_cursor: items.length > limit ? String(page[page.length - 1]._id) : null });
});

/** POST { name, group?, values: { "<column id or title>": value } } */
export const POST = v1<P>("items.write", async (req, ctx, { id }) => {
  const b = await board(ctx.workspace, id);
  if (!b) return apiErr("Board not found", 404);
  const p = z.object({ name: z.string().trim().min(1).max(200), group: z.string().optional(), values: z.record(z.unknown()).optional() }).safeParse(await req.json());
  if (!p.success) return apiErr("Body needs at least { name }");
  const item = await createItem(b as never, p.data, { label: ctx.label, source: ctx.app ? `app:${ctx.app.slug}` : "api" });
  return NextResponse.json({ item: publicItem(b as never, item.toObject() as never) }, { status: 201 });
});
