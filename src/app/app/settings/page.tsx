import { requireCtx } from "@/lib/context";
import { Board } from "@/lib/models";
import Settings from "@/components/Settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function Page() {
  const ctx = await requireCtx();
  const boards = await Board.find({ workspace: ctx.workspace.id }).select("name icon").lean();
  return <Settings ctx={ctx} boards={boards.map((b) => ({ id: String(b._id), name: b.name, icon: b.icon }))} origin={process.env.NEXTAUTH_URL || "http://localhost:3001"} />;
}
