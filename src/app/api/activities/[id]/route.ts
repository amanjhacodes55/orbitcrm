import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { Activity } from "@/lib/models";

type P = { id: string };
const find = (ws: string, id: string) => (isValidObjectId(id) ? Activity.findOne({ _id: id, workspace: ws }) : null);

/** Update a task (done / title / due / assignee) or edit your own note. */
export const PATCH = route<P>(async (req, ctx, { id }) => {
  const a = await find(ctx.workspace.id, id);
  if (!a) return err("Not found", 404);
  const p = z.object({ done: z.boolean().optional(), text: z.string().max(5000).optional(), due: z.string().nullable().optional(), assignee: z.string().nullable().optional() }).safeParse(await req.json());
  if (!p.success) return err("Invalid update");
  if (a.type !== "task" && (String(a.actor) !== ctx.user.id || p.data.done !== undefined)) return err("Only tasks or your own notes can be edited", 403);
  if (p.data.text !== undefined && p.data.text.trim()) a.text = p.data.text;
  if (p.data.done !== undefined) a.done = p.data.done;
  if (p.data.due !== undefined) a.due = p.data.due ? new Date(p.data.due) : undefined;
  if (p.data.assignee !== undefined) a.assignee = (p.data.assignee || undefined) as never;
  await a.save();
  return json({ ok: true });
});

export const DELETE = route<P>(async (_req, ctx, { id }) => {
  const a = await find(ctx.workspace.id, id);
  if (!a) return err("Not found", 404);
  if (!["note", "task"].includes(a.type) || (String(a.actor) !== ctx.user.id && ctx.workspace.role === "member")) return err("You can only delete your own notes and tasks", 403);
  await a.deleteOne();
  return json({ ok: true });
});
