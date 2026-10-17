import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { ApiKey } from "@/lib/models";
import { sha256, token } from "@/lib/ids";

export const GET = route(async (_req, ctx) => {
  const keys = await ApiKey.find({ workspace: ctx.workspace.id }).sort({ createdAt: -1 }).select("name prefix createdAt lastUsedAt").lean();
  return json({ keys: keys.map((k) => ({ id: String(k._id), name: k.name, prefix: k.prefix, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt })) });
}, { wsAdmin: true });

export const POST = route(async (req, ctx) => {
  const p = z.object({ name: z.string().trim().min(1).max(60) }).safeParse(await req.json());
  if (!p.success) return err("Give the key a name");
  const raw = token("orb_key", 24);
  await ApiKey.create({ workspace: ctx.workspace.id, name: p.data.name, prefix: raw.slice(0, 14), hash: sha256(raw), createdBy: ctx.user.id });
  return json({ key: raw }); // shown once
}, { wsAdmin: true });
