import Link from "next/link";
import { BadgeCheck, Store } from "lucide-react";
import { requireCtx } from "@/lib/context";
import { App, Installation } from "@/lib/models";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketplace" };

export default async function Marketplace({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const { q = "", c = "" } = await searchParams;
  const ctx = await requireCtx();
  const [apps, installs] = await Promise.all([
    App.find({ status: "approved" }).sort({ official: -1, installs: -1 }).lean(),
    Installation.find({ workspace: ctx.workspace.id, active: true }).select("app").lean(),
  ]);
  const installed = new Set(installs.map((i) => String(i.app)));
  const cats = [...new Set(apps.map((a) => a.category))];
  const list = apps.filter((a) => (!c || a.category === c) && (!q || `${a.name} ${a.tagline} ${a.description}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="rounded-2xl bg-gradient-to-r from-brand to-[#a25ddc] p-8 text-white">
        <h1 className="flex items-center gap-2 text-3xl font-bold"><Store className="size-7" /> App Marketplace</h1>
        <p className="mt-1 max-w-xl text-white/85">Dialers, enrichment, messaging and more. Every app is reviewed before it&apos;s listed, and you approve exactly what it can access.</p>
        <form className="mt-5 flex max-w-lg gap-2">
          <input name="q" defaultValue={q} placeholder="Search apps…" className="input !border-white/20 !bg-white/15 !text-white placeholder:!text-white/60" />
          <button className="btn bg-white text-brand">Search</button>
        </form>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/app/marketplace" className={`chip !py-1 ${!c ? "!border-brand !text-brand" : ""}`}>All</Link>
        {cats.map((x) => <Link key={x} href={`/app/marketplace?c=${encodeURIComponent(x)}`} className={`chip !py-1 ${c === x ? "!border-brand !text-brand" : ""}`}>{x}</Link>)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a) => (
          <Link key={String(a._id)} href={`/app/marketplace/${a.slug}`} className="card flex flex-col p-5 transition-colors hover:border-brand">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-xl bg-surface-2 text-2xl">{a.icon}</span>
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-semibold">{a.name}{a.official && <BadgeCheck className="size-4 text-brand" />}</p>
                <p className="text-xs text-muted">{a.category} · {a.installs} installs</p>
              </div>
              {installed.has(String(a._id)) && <span className="chip ml-auto !border-success/40 !text-success">Installed</span>}
            </div>
            <p className="mt-3 flex-1 text-sm text-muted">{a.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {a.features?.dialerUrl && <span className="chip">📞 Dialer</span>}
              {a.features?.settingsUrl && <span className="chip">⚙️ Settings</span>}
              {a.features?.itemPanelUrl && <span className="chip">🧩 Item panel</span>}
              {a.triggers.length > 0 && <span className="chip">⚡ {a.triggers.length} trigger{a.triggers.length > 1 ? "s" : ""}</span>}
              {a.actions.length > 0 && <span className="chip">▶ {a.actions.length} action{a.actions.length > 1 ? "s" : ""}</span>}
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && <p className="text-center text-sm text-muted">No apps match. Build one in the <Link href="/developer" className="text-brand">developer portal</Link>!</p>}
    </div>
  );
}
