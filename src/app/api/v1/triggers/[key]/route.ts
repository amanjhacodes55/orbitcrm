import { NextResponse } from "next/server";
import { z } from "zod";
import { v1, apiErr } from "@/lib/publicApi";
import { App } from "@/lib/models";
import { runAppTrigger } from "@/lib/automation";

/** App fires one of its declared triggers: POST { item_id?, board_id?, data: {...} } */
export const POST = v1<{ key: string }>("triggers.fire", async (req, ctx, { key }) => {
  if (!ctx.app) return apiErr("Only app installation tokens can fire triggers", 403);
  const app = await App.findById(ctx.app.id).select("triggers").lean();
  if (!app?.triggers.some((t) => t.key === key)) return apiErr(`Trigger “${key}” is not declared by this app`, 404);
  const p = z.object({ item_id: z.string().optional(), board_id: z.string().optional(), data: z.record(z.unknown()).default({}) }).safeParse(await req.json());
  if (!p.success) return apiErr("Invalid body");
  const results = await runAppTrigger(ctx.workspace, ctx.app.id, key, p.data);
  return NextResponse.json({ triggered: results.length, results });
});
