import { route, json } from "@/lib/api";
import { AutomationRun } from "@/lib/models";
import { plain } from "@/lib/serialize";

export const GET = route<{ id: string }>(async (_req, ctx, { id }) => {
  const runs = await AutomationRun.find({ automation: id, workspace: ctx.workspace.id }).sort({ createdAt: -1 }).limit(30).lean();
  return json({ runs: plain(runs) });
});
