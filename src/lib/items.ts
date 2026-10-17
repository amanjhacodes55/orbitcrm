import "server-only";
import { Types } from "mongoose";
import { Activity, Board, Item } from "@/lib/models";
import { coerceValue, findColumn, type Col } from "@/lib/values";
import { emit } from "@/lib/events";

export type Actor = { userId?: string | null; label?: string; source: string; depth?: number };

type BoardLike = { _id: unknown; workspace: unknown; columns: Col[]; groups: { id: string }[] };

/** Accepts values keyed by column id OR title; returns coerced map keyed by column id. */
export function normaliseValues(board: BoardLike, input: Record<string, unknown> | undefined) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input || {})) {
    const col = findColumn(board.columns, k);
    if (col) out[col.id] = coerceValue(col, v);
  }
  return out;
}

export async function createItem(board: BoardLike, data: { name: string; group?: string; values?: Record<string, unknown> }, actor: Actor) {
  const group = board.groups.find((g) => g.id === data.group)?.id || board.groups[0]?.id;
  if (!group) throw new Error("Board has no groups");
  const top = await Item.findOne({ board: board._id, group }).sort({ position: 1 }).select("position").lean();
  const item = await Item.create({
    workspace: board.workspace,
    board: board._id,
    group,
    name: (data.name || "Untitled").slice(0, 200),
    values: normaliseValues(board, data.values),
    position: (top?.position ?? 0) - 1,
    createdBy: actor.userId || undefined,
    source: actor.source,
  });
  await Activity.create({ workspace: board.workspace, board: board._id, item: item._id, type: "created", actor: actor.userId || undefined, actorLabel: actor.label || "", text: `created via ${actor.source}` });
  await emit("item.created", { workspace: String(board.workspace), board: board as never, item: item.toObject(), changes: [], actor });
  return item;
}

export async function updateItem(
  itemId: string | Types.ObjectId,
  patch: { name?: string; group?: string; values?: Record<string, unknown>; position?: number },
  actor: Actor,
  opts: { raw?: boolean } = {}
) {
  const item = await Item.findById(itemId);
  if (!item) throw new Error("Item not found");
  const board = await Board.findById(item.board).lean();
  if (!board) throw new Error("Board not found");
  const changes: { column: string; title: string; from: unknown; to: unknown }[] = [];
  if (patch.name !== undefined && patch.name.trim() && patch.name !== item.name) {
    changes.push({ column: "name", title: "Name", from: item.name, to: patch.name });
    item.name = patch.name.trim().slice(0, 200);
  }
  if (patch.group && patch.group !== item.group && board.groups.some((g) => g.id === patch.group)) {
    changes.push({ column: "group", title: "Group", from: item.group, to: patch.group });
    item.group = patch.group;
  }
  if (patch.position !== undefined) item.position = patch.position;
  if (patch.values) {
    const vals = opts.raw ? patch.values : normaliseValues(board as unknown as BoardLike, patch.values);
    const next = { ...(item.values || {}) } as Record<string, unknown>;
    for (const [cid, v] of Object.entries(vals)) {
      const col = board.columns.find((c) => c.id === cid);
      if (!col) continue;
      const before = next[cid] ?? null;
      const after = v ?? null;
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      next[cid] = after;
      changes.push({ column: cid, title: col.title, from: before, to: after });
    }
    item.values = next;
    item.markModified("values");
  }
  await item.save();
  if (changes.length) {
    const visible = changes.filter((c) => c.column !== "group" || true);
    await Activity.create({
      workspace: item.workspace,
      board: item.board,
      item: item._id,
      type: "update",
      actor: actor.userId || undefined,
      actorLabel: actor.label || "",
      data: { changes: visible },
    });
    await emit("item.updated", { workspace: String(item.workspace), board: board as never, item: item.toObject(), changes, actor });
  }
  return { item, changes };
}

export async function deleteItem(itemId: string, actor: Actor) {
  const item = await Item.findById(itemId);
  if (!item) return;
  const board = await Board.findById(item.board).lean();
  await item.deleteOne();
  await Activity.deleteMany({ item: item._id });
  await emit("item.deleted", { workspace: String(item.workspace), board: board as never, item: item.toObject(), changes: [], actor });
}
