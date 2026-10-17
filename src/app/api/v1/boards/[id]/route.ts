import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { v1, apiErr } from "@/lib/publicApi";
import { Board } from "@/lib/models";

export const GET = v1<{ id: string }>("boards.read", async (_req, ctx, { id }) => {
  const b = isValidObjectId(id) ? await Board.findOne({ _id: id, workspace: ctx.workspace }).lean() : null;
  if (!b) return apiErr("Board not found", 404);
  return NextResponse.json({ id: String(b._id), name: b.name, kind: b.kind, columns: b.columns, groups: b.groups });
});
