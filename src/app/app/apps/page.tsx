import { requireCtx } from "@/lib/context";
import { App, Installation, SCOPES } from "@/lib/models";
import InstalledApps from "@/components/InstalledApps";

export const dynamic = "force-dynamic";
export const metadata = { title: "Installed apps" };

export default async function Page() {
  const ctx = await requireCtx();
  const installs = await Installation.find({ workspace: ctx.workspace.id, active: true }).sort({ createdAt: 1 }).lean();
  const apps = await App.find({ _id: { $in: installs.map((i) => i.app) } }).lean();
  const list = installs.map((i) => {
    const a = apps.find((x) => String(x._id) === String(i.app))!;
    return { installationId: String(i._id), slug: a?.slug, name: a?.name, icon: a?.icon, tagline: a?.tagline, settingsUrl: a?.features?.settingsUrl || "", scopes: i.scopes.map((s) => SCOPES[s as keyof typeof SCOPES] || s), tokenPrefix: i.tokenPrefix || "", installedAt: String(i.createdAt) };
  }).filter((x) => x.name);
  return <InstalledApps apps={list} canAdmin={ctx.workspace.role !== "member"} user={ctx.user} workspace={ctx.workspace} />;
}
