import { route, err, json } from "@/lib/api";
import { User, Workspace } from "@/lib/models";

export const POST = route(async (req, ctx) => {
  const { id } = await req.json();
  if (!(await Workspace.exists({ _id: id, "members.user": ctx.user.id }))) return err("Not a member of that workspace", 403);
  await User.updateOne({ _id: ctx.user.id }, { workspace: id });
  return json({ ok: true });
}, { noWorkspace: true });
