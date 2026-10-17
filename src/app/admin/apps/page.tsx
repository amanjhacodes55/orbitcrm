import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCtx } from "@/lib/context";
import { App, SCOPES, User } from "@/lib/models";
import { appChecks } from "@/lib/reviewChecks";
import { Logo } from "@/components/ui";
import ReviewActions from "@/components/dev/ReviewActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "App review" };

export default async function AdminApps({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "in_review" } = await searchParams;
  const ctx = await getCtx();
  if (!ctx) redirect("/login?next=/admin/apps");
  if (!ctx.isPlatformAdmin) notFound();
  const apps = await App.find(s === "all" ? {} : { status: s }).sort({ updatedAt: -1 }).lean();
  const devs = await User.find({ _id: { $in: apps.map((a) => a.developer) } }).select("name email").lean();
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/app"><Logo /></Link>
        <h1 className="text-xl font-bold">Marketplace review</h1>
      </div>
      <div className="flex gap-2">
        {["in_review", "approved", "rejected", "draft", "all"].map((x) => <Link key={x} href={`/admin/apps?s=${x}`} className={`chip !py-1 ${s === x ? "!border-brand !text-brand" : ""}`}>{x.replace("_", " ")}</Link>)}
      </div>
      {apps.length === 0 && <p className="text-sm text-muted">Nothing here.</p>}
      {apps.map((a) => {
        const dev = devs.find((d) => String(d._id) === String(a.developer));
        const r = appChecks(a as never);
        return (
          <div key={String(a._id)} className="card space-y-3 p-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{a.icon}</span>
              <div className="min-w-0 flex-1"><p className="font-semibold">{a.name} <span className="text-xs font-normal text-muted">({a.status})</span></p><p className="text-xs text-muted">by {dev?.name} &lt;{dev?.email}&gt; · {a.category}</p></div>
              <Link href={`/app/marketplace/${a.slug}`} className="btn btn-secondary btn-sm">View listing</Link>
            </div>
            <p className="text-sm">{a.tagline}</p>
            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div><p className="mb-1 font-semibold">Scopes</p>{a.scopes.map((x) => <p key={x}>• {SCOPES[x as keyof typeof SCOPES] || x}</p>)}</div>
              <div><p className="mb-1 font-semibold">Surfaces & endpoints</p>{a.features?.dialerUrl && <p>📞 {a.features.dialerUrl}</p>}{a.features?.settingsUrl && <p>⚙️ {a.features.settingsUrl}</p>}{a.features?.itemPanelUrl && <p>🧩 {a.features.itemPanelUrl}</p>}{a.actions.map((x) => <p key={x.key}>▶ {x.key} → {x.url}</p>)}{a.triggers.map((x) => <p key={x.key}>⚡ {x.key}</p>)}{a.redirectUrls.map((u) => <p key={u}>🔐 {u}</p>)}</div>
              <div><p className="mb-1 font-semibold">Automated checks</p>{r.checks.map((c) => <p key={c.name} className={c.ok ? "" : "text-danger"}>{c.ok ? "✓" : "✗"} {c.name}</p>)}</div>
            </div>
            <ReviewActions id={String(a._id)} status={a.status} checksOk={r.ok} />
          </div>
        );
      })}
    </div>
  );
}
