import "server-only";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import { sessionUserId } from "@/lib/auth";
import { User, Workspace } from "@/lib/models";

export type Ctx = {
  user: { id: string; name: string; email: string; image: string };
  workspace: { id: string; name: string; role: "owner" | "admin" | "member" };
  isPlatformAdmin: boolean;
};

export function platformAdmins() {
  return (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/** Signed-in user + their current workspace (null if not signed in). Creates nothing. */
export async function getCtx(): Promise<Ctx | null> {
  const uid = await sessionUserId();
  if (!uid) return null;
  await dbConnect();
  const u = await User.findById(uid).lean();
  if (!u) return null;
  let ws = u.workspace ? await Workspace.findOne({ _id: u.workspace, "members.user": u._id }).lean() : null;
  if (!ws) {
    ws = await Workspace.findOne({ "members.user": u._id }).sort({ createdAt: 1 }).lean();
    if (ws) await User.updateOne({ _id: u._id }, { workspace: ws._id });
  }
  const base = { user: { id: String(u._id), name: u.name, email: u.email, image: u.image || "" }, isPlatformAdmin: platformAdmins().includes(u.email) };
  if (!ws) return { ...base, workspace: { id: "", name: "", role: "member" } };
  const role = (ws.members.find((mm) => String(mm.user) === String(u._id))?.role || "member") as Ctx["workspace"]["role"];
  return { ...base, workspace: { id: String(ws._id), name: ws.name, role } };
}

/** For pages under /app: must be signed in and have a workspace. */
export async function requireCtx(): Promise<Ctx> {
  const c = await getCtx();
  if (!c) redirect("/login");
  if (!c.workspace.id) redirect("/onboarding");
  return c;
}
