import { requireCtx } from "@/lib/context";
import { App, Board, Installation, Workspace } from "@/lib/models";
import Shell from "@/components/Shell";
import { DialerProvider } from "@/components/Dialer";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const [boards, installs, workspaces] = await Promise.all([
    Board.find({ workspace: ctx.workspace.id }).sort({ position: 1, createdAt: 1 }).select("name icon").lean(),
    Installation.find({ workspace: ctx.workspace.id, active: true }).select("app").lean(),
    Workspace.find({ "members.user": ctx.user.id }).select("name").lean(),
  ]);
  const apps = await App.find({ _id: { $in: installs.map((i) => i.app) }, "features.dialerUrl": { $ne: "" } }).select("name icon features").lean();
  const dialerApps = apps.map((a) => ({ installationId: String(installs.find((i) => String(i.app) === String(a._id))!._id), name: a.name, icon: a.icon, url: a.features!.dialerUrl! }));
  return (
    <DialerProvider apps={dialerApps} user={ctx.user} workspace={ctx.workspace}>
      <Shell
        ctx={ctx}
        boards={boards.map((b) => ({ id: String(b._id), name: b.name, icon: b.icon }))}
        workspaces={workspaces.map((w) => ({ id: String(w._id), name: w.name }))}
      >
        {children}
      </Shell>
    </DialerProvider>
  );
}
