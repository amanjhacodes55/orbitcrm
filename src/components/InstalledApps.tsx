"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Settings, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { Empty, timeAgo } from "@/components/ui";
import AppFrame from "@/components/AppFrame";

type A = { installationId: string; slug: string; name: string; icon: string; tagline: string; settingsUrl: string; scopes: string[]; tokenPrefix?: string; installedAt: string };

export default function InstalledApps({ apps, canAdmin, user, workspace }: { apps: A[]; canAdmin: boolean; user: Record<string, unknown>; workspace: Record<string, unknown> }) {
  const router = useRouter();
  const toast = useToast();
  const [sel, setSel] = useState(apps[0]?.installationId || "");
  const app = apps.find((a) => a.installationId === sel);
  async function uninstall(a: A) {
    if (!confirm(`Uninstall ${a.name}? Its access token is revoked, its webhooks are deleted and automations using it are paused.`)) return;
    const r = await api(`/api/installations/${a.installationId}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, "error");
    toast(`${a.name} uninstalled`, "success");
    router.refresh();
  }
  if (!apps.length) return <div className="mx-auto max-w-3xl p-8"><div className="card"><Empty art="puzzle" title="No apps installed">Browse the <Link href="/app/marketplace" className="text-brand">Marketplace</Link> to add dialers, enrichment and more.</Empty></div></div>;
  return (
    <div className="mx-auto grid max-w-6xl gap-5 p-4 md:grid-cols-[280px_1fr] md:p-8">
      <div className="space-y-2">
        <h1 className="mb-3 text-2xl font-bold">Installed apps</h1>
        {apps.map((a) => (
          <button key={a.installationId} onClick={() => setSel(a.installationId)} className={clsx("card flex w-full items-center gap-3 p-3 text-left", sel === a.installationId && "!border-brand")}>
            <span className="text-2xl">{a.icon}</span>
            <span className="min-w-0"><span className="block truncate font-semibold">{a.name}</span><span className="block truncate text-xs text-muted">{a.tagline}</span></span>
          </button>
        ))}
      </div>
      {app && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-5">
            <span className="text-3xl">{app.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{app.name}</p>
              <p className="text-xs text-muted">Installed {timeAgo(app.installedAt)} · token <code>{app.tokenPrefix}…</code></p>
            </div>
            <Link href={`/app/marketplace/${app.slug}`} className="btn btn-secondary btn-sm">Listing</Link>
            {canAdmin && <button onClick={() => uninstall(app)} className="btn btn-ghost btn-sm hover:!text-danger"><Trash2 className="size-3.5" /> Uninstall</button>}
          </div>
          <div className="border-b border-border p-5 text-sm">
            <p className="mb-2 font-semibold">Permissions</p>
            <ul className="grid gap-1 sm:grid-cols-2">{app.scopes.map((s) => <li key={s}>✓ {s}</li>)}</ul>
          </div>
          <div className="p-5">
            <p className="mb-3 flex items-center gap-2 font-semibold"><Settings className="size-4" /> App settings</p>
            {app.settingsUrl ? (
              <div className="rounded-lg border border-border">
                <AppFrame key={app.installationId} installationId={app.installationId} url={app.settingsUrl} surface="settings" context={{ user, workspace, canAdmin }} height={480} />
              </div>
            ) : <p className="text-sm text-muted">This app has no settings page.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
