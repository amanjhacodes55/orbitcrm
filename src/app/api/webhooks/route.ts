import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { Webhook } from "@/lib/models";
import { EVENTS } from "@/lib/events";
import { token } from "@/lib/ids";
import { plain } from "@/lib/serialize";

export const GET = route(async (_req, ctx) => {
  const hooks = await Webhook.find({ workspace: ctx.workspace.id }).sort({ createdAt: -1 }).populate("installation", "app").lean();
  return json({ webhooks: plain(hooks) });
});

export const POST = route(async (req, ctx) => {
  const p = z.object({ url: z.string().url().max(500), events: z.array(z.enum(EVENTS)).min(1), board: z.string().optional().nullable() }).safeParse(await req.json());
  if (!p.success) return err("Enter a valid URL and pick at least one event");
  if (!/^https?:\/\//.test(p.data.url)) return err("URL must be http(s)");
  const h = await Webhook.create({ workspace: ctx.workspace.id, url: p.data.url, events: p.data.events, board: p.data.board || undefined, secret: token("whsec", 18) });
  return json({ webhook: plain(h.toObject()) });
}, { wsAdmin: true });
