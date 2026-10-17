import { route, err, json } from "@/lib/api";
import { Automation } from "@/lib/models";
import { boardFor } from "@/lib/access";
import { AutoBody } from "@/lib/schemas";
import { token } from "@/lib/ids";
import { plain } from "@/lib/serialize";

export const GET = route(async (req, ctx) => {
  const board = new URL(req.url).searchParams.get("board");
  const q: Record<string, unknown> = { workspace: ctx.workspace.id };
  if (board) q.board = board;
  const autos = await Automation.find(q).sort({ createdAt: -1 }).lean();
  return json({ automations: plain(autos) });
});

export const POST = route(async (req, ctx) => {
  const p = AutoBody.safeParse(await req.json());
  if (!p.success) return err(p.error.issues[0].message);
  if (!(await boardFor(ctx, p.data.board))) return err("Board not found", 404);
  if ((await Automation.countDocuments({ workspace: ctx.workspace.id })) >= 100) return err("Automation limit reached (100).");
  const a = await Automation.create({ ...p.data, workspace: ctx.workspace.id, createdBy: ctx.user.id, hookToken: p.data.trigger.type === "catch_hook" ? token("hook", 18) : undefined });
  return json({ automation: plain(a.toObject()) });
});
