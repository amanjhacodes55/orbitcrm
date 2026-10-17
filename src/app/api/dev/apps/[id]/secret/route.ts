import { route, err, json } from "@/lib/api";
import { App } from "@/lib/models";
import { sha256, token } from "@/lib/ids";

export const POST = route<{ id: string }>(async (_req, ctx, { id }) => {
  const secret = token("orb_secret", 24);
  const r = await App.updateOne({ _id: id, developer: ctx.user.id }, { clientSecretHash: sha256(secret) });
  if (!r.matchedCount) return err("Not found", 404);
  return json({ clientSecret: secret });
}, { noWorkspace: true });
