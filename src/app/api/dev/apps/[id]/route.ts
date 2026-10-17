import { isValidObjectId } from "mongoose";
import { route, err, json } from "@/lib/api";
import { App, Installation } from "@/lib/models";
import { AppInput } from "@/lib/appInput";
import { appChecks } from "@/lib/reviewChecks";
import { plain } from "@/lib/serialize";

type P = { id: string };
const mine = (uid: string, id: string) => (isValidObjectId(id) ? App.findOne({ _id: id, developer: uid }).select("+signingSecret") : null);

export const GET = route<P>(async (_req, ctx, { id }) => {
  const app = await mine(ctx.user.id, id);
  if (!app) return err("Not found", 404);
  return json({ app: plain(app.toObject()), review: appChecks(app.toObject() as never) });
}, { noWorkspace: true });

export const PUT = route<P>(async (req, ctx, { id }) => {
  const app = await mine(ctx.user.id, id);
  if (!app) return err("Not found", 404);
  const p = AppInput.safeParse(await req.json());
  if (!p.success) return err(`${p.error.issues[0].path.join(".")}: ${p.error.issues[0].message}`);
  app.set(p.data);
  // Editing an approved app's listing sends it back to review only if scopes changed.
  if (app.status === "approved" && app.isModified("scopes")) app.status = "in_review";
  await app.save();
  return json({ app: plain(app.toObject()), review: appChecks(app.toObject() as never) });
}, { noWorkspace: true });

export const DELETE = route<P>(async (_req, ctx, { id }) => {
  const app = await mine(ctx.user.id, id);
  if (!app) return err("Not found", 404);
  await Installation.deleteMany({ app: app._id });
  await app.deleteOne();
  return json({ ok: true });
}, { noWorkspace: true });
