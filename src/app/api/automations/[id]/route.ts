import { isValidObjectId } from "mongoose";
import { route, err, json } from "@/lib/api";
import { Automation } from "@/lib/models";
import { token } from "@/lib/ids";
import { plain } from "@/lib/serialize";
import { AutoBody } from "@/lib/schemas";

type P = { id: string };
const find = (ws: string, id: string) => (isValidObjectId(id) ? Automation.findOne({ _id: id, workspace: ws }) : null);

export const PATCH = route<P>(async (req, ctx, { id }) => {
  const a = await find(ctx.workspace.id, id);
  if (!a) return err("Not found", 404);
  const body = await req.json();
  if (Object.keys(body).length === 1 && "enabled" in body) {
    a.enabled = !!body.enabled;
  } else {
    const p = AutoBody.safeParse({ ...body, board: String(a.board) });
    if (!p.success) return err(p.error.issues[0].message);
    a.set({ ...p.data, board: a.board });
    if (p.data.trigger.type === "catch_hook" && !a.hookToken) a.hookToken = token("hook", 18);
  }
  await a.save();
  return json({ automation: plain(a.toObject()) });
});

export const DELETE = route<P>(async (_req, ctx, { id }) => {
  const a = await find(ctx.workspace.id, id);
  if (!a) return err("Not found", 404);
  await a.deleteOne();
  return json({ ok: true });
});
