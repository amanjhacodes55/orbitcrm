import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { createWorkspace } from "@/lib/workspace";
import { Workspace } from "@/lib/models";

export const GET = route(async (_req, ctx) => {
  const list = await Workspace.find({ "members.user": ctx.user.id }).select("name").lean();
  return json({ current: ctx.workspace.id, workspaces: list.map((w) => ({ id: String(w._id), name: w.name })) });
}, { noWorkspace: true });

export const POST = route(async (req, ctx) => {
  const p = z.object({ name: z.string().trim().min(2).max(80), samples: z.boolean().default(true) }).safeParse(await req.json());
  if (!p.success) return err("Workspace name must be 2–80 characters.");
  const ws = await createWorkspace(ctx.user.id, p.data.name, p.data.samples);
  return json({ id: String(ws._id) });
}, { noWorkspace: true });

export const PATCH = route(async (req, ctx) => {
  const p = z.object({ name: z.string().trim().min(2).max(80) }).safeParse(await req.json());
  if (!p.success) return err("Invalid name");
  await Workspace.updateOne({ _id: ctx.workspace.id }, { name: p.data.name });
  return json({ ok: true });
}, { wsAdmin: true });
