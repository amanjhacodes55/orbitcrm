import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { Channel, Conversation, Message } from "@/lib/models";
import { plain } from "@/lib/serialize";

type P = { id: string };
const Body = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  active: z.boolean().optional(),
  settings: z.object({
    color: z.string().max(20).optional(), greeting: z.string().max(300).optional(), leadBoard: z.string().optional(), autoCreateLead: z.boolean().optional(),
    outboundWebhookUrl: z.string().max(500).optional(), fromEmail: z.string().max(200).optional(), twilioSid: z.string().max(64).optional(), twilioFrom: z.string().max(40).optional(),
  }).partial().optional(),
  twilioToken: z.string().max(128).optional(),
});

export const PATCH = route<P>(async (req, ctx, { id }) => {
  if (!isValidObjectId(id)) return err("Not found", 404);
  const ch = await Channel.findOne({ _id: id, workspace: ctx.workspace.id });
  if (!ch) return err("Not found", 404);
  const p = Body.safeParse(await req.json());
  if (!p.success) return err(p.error.issues[0].message);
  if (p.data.settings?.outboundWebhookUrl && !/^https?:\/\//.test(p.data.settings.outboundWebhookUrl)) return err("Outbound webhook must be an http(s) URL");
  if (p.data.name) ch.name = p.data.name;
  if (p.data.active !== undefined) ch.active = p.data.active;
  if (p.data.settings) for (const [k, v] of Object.entries(p.data.settings)) ch.set(`settings.${k}`, v);
  if (p.data.twilioToken) ch.set("twilioToken", p.data.twilioToken);
  await ch.save();
  return json({ channel: plain(ch.toObject()) });
}, { wsAdmin: true });

export const DELETE = route<P>(async (_req, ctx, { id }) => {
  const ch = isValidObjectId(id) ? await Channel.findOne({ _id: id, workspace: ctx.workspace.id }) : null;
  if (!ch) return err("Not found", 404);
  const convs = await Conversation.find({ channel: ch._id }).select("_id").lean();
  await Message.deleteMany({ conversation: { $in: convs.map((c) => c._id) } });
  await Conversation.deleteMany({ channel: ch._id });
  await ch.deleteOne();
  return json({ ok: true });
}, { wsAdmin: true });
