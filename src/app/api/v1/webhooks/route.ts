import { NextResponse } from "next/server";
import { z } from "zod";
import { v1, apiErr } from "@/lib/publicApi";
import { Webhook } from "@/lib/models";
import { EVENTS } from "@/lib/events";
import { token } from "@/lib/ids";

export const GET = v1("webhooks.write", async (_req, ctx) => {
  const q = ctx.installation ? { workspace: ctx.workspace, installation: ctx.installation } : { workspace: ctx.workspace };
  const hooks = await Webhook.find(q).lean();
  return NextResponse.json({ webhooks: hooks.map((h) => ({ id: String(h._id), url: h.url, events: h.events, active: h.active })) });
});

export const POST = v1("webhooks.write", async (req, ctx) => {
  const p = z.object({ url: z.string().url(), events: z.array(z.enum(EVENTS)).min(1), board_id: z.string().optional() }).safeParse(await req.json());
  if (!p.success) return apiErr(`Body: { url, events: [${EVENTS.join(", ")}] }`);
  const h = await Webhook.create({ workspace: ctx.workspace, url: p.data.url, events: p.data.events, board: p.data.board_id, secret: token("whsec", 18), installation: ctx.installation });
  return NextResponse.json({ id: String(h._id), secret: h.secret, events: h.events }, { status: 201 });
});
