import { Suspense } from "react";
import { requireCtx } from "@/lib/context";
import { App, Automation, Board, Installation } from "@/lib/models";
import { memberMap } from "@/lib/access";
import { plain } from "@/lib/serialize";
import Automations from "@/components/Automations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automations" };

export default async function Page() {
  const ctx = await requireCtx();
  const [boards, autos, installs, members] = await Promise.all([
    Board.find({ workspace: ctx.workspace.id }).sort({ position: 1 }).select("name icon columns groups").lean(),
    Automation.find({ workspace: ctx.workspace.id }).sort({ createdAt: -1 }).lean(),
    Installation.find({ workspace: ctx.workspace.id, active: true }).lean(),
    memberMap(ctx.workspace.id),
  ]);
  const apps = await App.find({ _id: { $in: installs.map((i) => i.app) } }).select("name icon triggers actions").lean();
  const appInfo = installs.map((i) => {
    const a = apps.find((x) => String(x._id) === String(i.app));
    return { installationId: String(i._id), appId: String(i.app), name: a?.name || "App", icon: a?.icon || "🧩", triggers: a?.triggers || [], actions: a?.actions || [] };
  });
  const origin = process.env.NEXTAUTH_URL || "http://localhost:3001";
  return (
    <Suspense>
      <Automations boards={plain(boards) as never} initial={plain(autos) as never} apps={plain(appInfo) as never} members={members} origin={origin} />
    </Suspense>
  );
}
