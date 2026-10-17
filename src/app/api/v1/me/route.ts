import { NextResponse } from "next/server";
import { v1 } from "@/lib/publicApi";
import { Workspace } from "@/lib/models";

export const GET = v1(null, async (_req, ctx) => {
  const ws = await Workspace.findById(ctx.workspace).select("name").lean();
  return NextResponse.json({ workspace: { id: ctx.workspace, name: ws?.name }, scopes: ctx.scopes, app: ctx.app ?? null, installation_id: ctx.installation ?? null });
});
