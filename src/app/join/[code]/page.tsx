import { redirect } from "next/navigation";
import { getCtx } from "@/lib/context";
import { dbConnect } from "@/lib/db";
import { User, Workspace } from "@/lib/models";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ctx = await getCtx();
  if (!ctx) redirect(`/register?next=/join/${code}`);
  await dbConnect();
  const ws = await Workspace.findOne({ inviteCode: code });
  if (!ws) redirect("/onboarding");
  if (!ws.members.some((m) => String(m.user) === ctx.user.id)) {
    ws.members.push({ user: ctx.user.id as never, role: "member" });
    await ws.save();
  }
  await User.updateOne({ _id: ctx.user.id }, { workspace: ws._id });
  redirect("/app");
}
