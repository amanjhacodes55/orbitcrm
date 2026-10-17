import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { Workspace } from "@/lib/models";
import { memberMap } from "@/lib/access";
import { rid } from "@/lib/ids";

export const GET = route(async (_req, ctx) => {
  const ws = await Workspace.findById(ctx.workspace.id).select("inviteCode").lean();
  return json({ members: await memberMap(ctx.workspace.id), inviteCode: ctx.workspace.role !== "member" ? ws?.inviteCode : null });
});

const Body = z.object({ action: z.enum(["role", "remove", "reset_invite"]), user: z.string().optional(), role: z.enum(["admin", "member"]).optional() });
export const POST = route(async (req, ctx) => {
  const p = Body.safeParse(await req.json());
  if (!p.success) return err("Invalid request");
  const ws = await Workspace.findById(ctx.workspace.id);
  if (!ws) return err("Not found", 404);
  if (p.data.action === "reset_invite") {
    ws.inviteCode = rid(10);
    await ws.save();
    return json({ inviteCode: ws.inviteCode });
  }
  const m = ws.members.find((x) => String(x.user) === p.data.user);
  if (!m) return err("Member not found", 404);
  if (m.role === "owner") return err("The owner can't be changed or removed.");
  if (p.data.action === "role" && p.data.role) m.role = p.data.role;
  if (p.data.action === "remove") ws.members = ws.members.filter((x) => String(x.user) !== p.data.user) as never;
  await ws.save();
  return json({ ok: true });
}, { wsAdmin: true });
