import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { Board, Channel, CHANNEL_TYPES } from "@/lib/models";
import { token } from "@/lib/ids";
import { plain } from "@/lib/serialize";

export const GET = route(async (_req, ctx) => {
  const chans = await Channel.find({ workspace: ctx.workspace.id }).sort({ createdAt: 1 }).lean();
  return json({ channels: plain(chans) });
});

export const POST = route(async (req, ctx) => {
  const p = z.object({ type: z.enum(CHANNEL_TYPES), name: z.string().trim().min(1).max(60) }).safeParse(await req.json());
  if (!p.success) return err("Pick a channel type and name");
  const leads = await Board.findOne({ workspace: ctx.workspace.id, kind: "leads" }).select("_id").lean();
  const ch = await Channel.create({ workspace: ctx.workspace.id, type: p.data.type, name: p.data.name, token: token("ch", 12), signingSecret: token("chsec", 18), settings: { leadBoard: leads ? String(leads._id) : "" } });
  return json({ channel: plain(ch.toObject()) });
}, { wsAdmin: true });
