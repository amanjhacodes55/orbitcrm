import { route, err, json } from "@/lib/api";
import { App, Notification, User } from "@/lib/models";
import { appChecks } from "@/lib/reviewChecks";
import { platformAdmins } from "@/lib/context";

export const POST = route<{ id: string }>(async (_req, ctx, { id }) => {
  const app = await App.findOne({ _id: id, developer: ctx.user.id });
  if (!app) return err("Not found", 404);
  const r = appChecks(app.toObject() as never);
  if (!r.ok) return err("Fix the failing listing checks first: " + r.checks.filter((c) => !c.ok).map((c) => c.name).join("; "), 422);
  app.status = "in_review";
  await app.save();
  const admins = await User.find({ email: { $in: platformAdmins() } }).select("_id").lean();
  await Notification.insertMany(admins.map((a) => ({ user: a._id, text: `New app submitted for review: ${app.name}`, link: "/admin/apps" })));
  return json({ status: app.status });
}, { noWorkspace: true });
