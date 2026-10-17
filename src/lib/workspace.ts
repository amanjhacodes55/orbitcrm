import "server-only";
import { Board, User, Workspace } from "@/lib/models";
import { rid } from "@/lib/ids";
import { TEMPLATES } from "@/lib/templates";

export async function createWorkspace(userId: string, name: string, withSamples = true) {
  const ws = await Workspace.create({ name, owner: userId, members: [{ user: userId, role: "owner" }], inviteCode: rid(10) });
  await User.updateOne({ _id: userId }, { workspace: ws._id });
  if (withSamples) {
    const { seedSampleData } = await import("@/lib/sample");
    await seedSampleData(String(ws._id), userId);
  } else {
    const t = TEMPLATES.leads;
    await Board.create({ workspace: ws._id, name: t.name, icon: t.icon, kind: t.kind, itemLabel: t.itemLabel, description: t.description, ...t.build() });
  }
  return ws;
}
