import { NextResponse } from "next/server";
import { v1 } from "@/lib/publicApi";
import { Board } from "@/lib/models";

export const GET = v1("boards.read", async (_req, ctx) => {
  const boards = await Board.find({ workspace: ctx.workspace }).select("name kind columns groups").lean();
  return NextResponse.json({
    boards: boards.map((b) => ({ id: String(b._id), name: b.name, kind: b.kind, columns: b.columns.map((c) => ({ id: c.id, title: c.title, type: c.type, options: c.options?.map((o) => o.label) })), groups: b.groups.map((g) => ({ id: g.id, title: g.title })) })),
  });
});
