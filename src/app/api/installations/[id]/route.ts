import { isValidObjectId } from "mongoose";
import { route, err, json } from "@/lib/api";
import { App, Automation, Installation, Webhook } from "@/lib/models";

type P = { id: string };
const find = (ws: string, id: string) => (isValidObjectId(id) ? Installation.findOne({ _id: id, workspace: ws }) : null);

// Save app settings (called by the host page when an embedded settings page sends settings.save)
export const PATCH = route<P>(async (req, ctx, { id }) => {
  const inst = await find(ctx.workspace.id, id);
  if (!inst) return err("Not found", 404);
  const { settings } = await req.json();
  if (!settings || typeof settings !== "object" || JSON.stringify(settings).length > 20000) return err("Settings must be an object under 20 KB");
  inst.settings = settings;
  inst.markModified("settings");
  await inst.save();
  return json({ ok: true });
});

export const DELETE = route<P>(async (_req, ctx, { id }) => {
  const inst = await find(ctx.workspace.id, id);
  if (!inst) return err("Not found", 404);
  await Webhook.deleteMany({ installation: inst._id });
  await Automation.updateMany({ workspace: ctx.workspace.id, $or: [{ "trigger.config.app": String(inst.app) }, { "actions.config.installation": String(inst._id) }] }, { enabled: false });
  await App.updateOne({ _id: inst.app, installs: { $gt: 0 } }, { $inc: { installs: -1 } });
  await inst.deleteOne();
  return json({ ok: true });
}, { wsAdmin: true });
