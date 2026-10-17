import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Globe, Mail } from "lucide-react";
import { requireCtx } from "@/lib/context";
import { App, Installation, SCOPES, User } from "@/lib/models";
import InstallButton from "@/components/InstallButton";

export const dynamic = "force-dynamic";

export default async function AppListing({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireCtx();
  const app = await App.findOne({ slug }).lean();
  if (!app || (app.status !== "approved" && String(app.developer) !== ctx.user.id)) notFound();
  const [inst, dev] = await Promise.all([Installation.findOne({ app: app._id, workspace: ctx.workspace.id, active: true }).lean(), User.findById(app.developer).select("name").lean()]);
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <Link href="/app/marketplace" className="btn btn-ghost btn-sm -ml-2"><ArrowLeft className="size-3.5" /> Marketplace</Link>
      {app.status !== "approved" && <p className="rounded-lg bg-warn/15 px-4 py-2 text-sm text-warn">Preview — this app is <b>{app.status.replace("_", " ")}</b>. Only you (the developer) can install it for testing.</p>}
      <div className="card flex flex-wrap items-center gap-5 p-6">
        <span className="flex size-20 items-center justify-center rounded-2xl bg-surface-2 text-5xl">{app.icon}</span>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">{app.name}{app.official && <BadgeCheck className="size-5 text-brand" />}</h1>
          <p className="text-muted">{app.tagline}</p>
          <p className="mt-1 text-xs text-faint">by {dev?.name} · {app.category} · {app.installs} installs</p>
        </div>
        <InstallButton slug={app.slug} name={app.name} installed={!!inst} canInstall={ctx.workspace.role !== "member"} scopes={app.scopes.map((s) => ({ key: s, label: SCOPES[s as keyof typeof SCOPES] || s }))} />
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="card space-y-5 p-6">
          <div><h2 className="mb-2 font-semibold">About</h2><p className="whitespace-pre-wrap text-sm leading-relaxed">{app.description}</p></div>
          {(app.triggers.length > 0 || app.actions.length > 0) && (
            <div>
              <h2 className="mb-2 font-semibold">Use it in automations</h2>
              <ul className="space-y-2 text-sm">
                {app.triggers.map((t) => <li key={t.key} className="rounded-lg bg-brand-soft/50 px-3 py-2">⚡ <b>Trigger:</b> {t.label}{t.description ? ` — ${t.description}` : ""}</li>)}
                {app.actions.map((t) => <li key={t.key} className="rounded-lg bg-success/10 px-3 py-2">▶ <b>Action:</b> {t.label}{t.description ? ` — ${t.description}` : ""}</li>)}
              </ul>
            </div>
          )}
        </div>
        <aside className="card space-y-4 p-5 text-sm">
          <div>
            <h3 className="mb-2 font-semibold">Permissions requested</h3>
            <ul className="space-y-1.5">{app.scopes.map((s) => <li key={s} className="flex gap-2"><span className="text-success">✓</span>{SCOPES[s as keyof typeof SCOPES] || s}</li>)}</ul>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Works in</h3>
            <ul className="space-y-1 text-muted">
              {app.features?.dialerUrl && <li>📞 The dialer (click any phone number)</li>}
              {app.features?.itemPanelUrl && <li>🧩 Item side panel</li>}
              {app.features?.settingsUrl && <li>⚙️ Its own settings page</li>}
              {app.redirectUrls.length > 0 && <li>🔐 Connects to its own service via OAuth</li>}
            </ul>
          </div>
          {app.website && <a href={app.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand"><Globe className="size-4" /> Website</a>}
          {app.supportEmail && <a href={`mailto:${app.supportEmail}`} className="flex items-center gap-2 text-brand"><Mail className="size-4" /> {app.supportEmail}</a>}
        </aside>
      </div>
    </div>
  );
}
