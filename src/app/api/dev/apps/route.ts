import { route, err, json } from "@/lib/api";
import { App } from "@/lib/models";
import { AppInput } from "@/lib/appInput";
import { sha256, slugify, token, rid } from "@/lib/ids";
import { plain } from "@/lib/serialize";

export const GET = route(async (_req, ctx) => {
  const apps = await App.find({ developer: ctx.user.id }).sort({ updatedAt: -1 }).lean();
  return json({ apps: plain(apps) });
}, { noWorkspace: true });

export const POST = route(async (req, ctx) => {
  const p = AppInput.safeParse(await req.json());
  if (!p.success) return err(`${p.error.issues[0].path.join(".")}: ${p.error.issues[0].message}`);
  if ((await App.countDocuments({ developer: ctx.user.id })) >= 20) return err("Limit of 20 apps per developer.");
  let slug = slugify(p.data.name);
  if (await App.exists({ slug })) slug = `${slug}-${rid(3).toLowerCase()}`;
  const secret = token("orb_secret", 24);
  const app = await App.create({ ...p.data, developer: ctx.user.id, slug, clientId: token("orb_client", 10), clientSecretHash: sha256(secret), signingSecret: token("orb_sign", 18) });
  return json({ app: plain(app.toObject()), clientSecret: secret });
}, { noWorkspace: true });
