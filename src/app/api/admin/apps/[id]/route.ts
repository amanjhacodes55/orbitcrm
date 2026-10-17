import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { App, Notification } from "@/lib/models";

export const POST = route<{ id: string }>(async (req, _ctx, { id }) => {
  const p = z.object({ action: z.enum(["approve", "reject", "unlist"]), notes: z.string().max(2000).default("") }).safeParse(await req.json());
  if (!p.success) return err("Invalid request");
  const app = await App.findById(id);
  if (!app) return err("Not found", 404);
  if (p.data.action !== "approve" && !p.data.notes.trim()) return err("Add a note explaining why.");
  app.status = p.data.action === "approve" ? "approved" : p.data.action === "reject" ? "rejected" : "draft";
  app.reviewNotes = p.data.notes;
  await app.save();
  await Notification.create({ user: app.developer, text: p.data.action === "approve" ? `🎉 ${app.name} is approved and live on the marketplace!` : `${app.name} was ${app.status === "rejected" ? "rejected" : "unlisted"}: ${p.data.notes}`, link: `/developer/apps/${app._id}` });
  return json({ status: app.status });
}, { platformAdmin: true, noWorkspace: true });
