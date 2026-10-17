import { NextResponse } from "next/server";
import { v1 } from "@/lib/publicApi";
import { Webhook } from "@/lib/models";

export const DELETE = v1<{ id: string }>("webhooks.write", async (_req, ctx, { id }) => {
  const q: Record<string, unknown> = { _id: id, workspace: ctx.workspace };
  if (ctx.installation) q.installation = ctx.installation;
  const r = await Webhook.deleteOne(q).catch(() => ({ deletedCount: 0 }));
  return NextResponse.json({ deleted: r.deletedCount > 0 });
});
