import { route, json } from "@/lib/api";
import { ApiKey } from "@/lib/models";

export const DELETE = route<{ id: string }>(async (_req, ctx, { id }) => {
  await ApiKey.deleteOne({ _id: id, workspace: ctx.workspace.id });
  return json({ ok: true });
}, { wsAdmin: true });
