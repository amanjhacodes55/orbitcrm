import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { User } from "@/lib/models";
import { THEME_IDS } from "@/lib/themes";

export const PATCH = route(async (req, ctx) => {
  const p = z.object({ theme: z.string().refine((t) => THEME_IDS.includes(t), "Unknown theme").optional(), name: z.string().trim().min(2).max(80).optional() }).safeParse(await req.json());
  if (!p.success) return err(p.error.issues[0].message);
  await User.updateOne({ _id: ctx.user.id }, { $set: p.data });
  return json({ ok: true });
}, { noWorkspace: true });
