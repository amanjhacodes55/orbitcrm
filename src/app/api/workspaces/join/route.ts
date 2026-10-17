import { route, err, json } from "@/lib/api";
import { User, Workspace } from "@/lib/models";

export const POST = route(async (req, ctx) => {
  const { code } = await req.json();
  const ws = await Workspace.findOne({ inviteCode: String(code || "") });
  if (!ws) return err("Invite link is invalid or was reset.", 404);
  if (!ws.members.some((m) => String(m.user) === ctx.user.id)) {
    ws.members.push({ user: ctx.user.id as never, role: "member" });
    await ws.save();
  }
  await User.updateOne({ _id: ctx.user.id }, { workspace: ws._id });
  return json({ ok: true, name: ws.name });
}, { noWorkspace: true });
