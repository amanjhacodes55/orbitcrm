import Link from "next/link";
import { redirect } from "next/navigation";
import { Code2 } from "lucide-react";
import { getCtx } from "@/lib/context";
import { App } from "@/lib/models";
import NewAppButton from "@/components/dev/NewAppButton";

export const metadata = { title: "Developer portal" };

const STATUS: Record<string, string> = { draft: "bg-surface-3 text-muted", in_review: "bg-[#579bfc]/15 text-[#579bfc]", approved: "bg-success/15 text-success", rejected: "bg-danger/15 text-danger" };

export default async function DevHome() {
  const ctx = await getCtx();
  if (!ctx) redirect("/login?next=/developer");
  const apps = await App.find({ developer: ctx.user.id }).sort({ updatedAt: -1 }).lean();
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Code2 className="size-6 text-brand" /> Your apps</h1>
          <p className="text-sm text-muted">Build dialers, settings pages, item panels, automation triggers & actions — then publish to the OrbitCRM Marketplace.</p>
        </div>
        <NewAppButton />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[["1. Create", "Define your listing, scopes, OAuth redirect and the surfaces your app plugs into."], ["2. Build & test", "Embed pages with the App SDK, call the REST API, receive webhooks. Install your draft in your own workspace."], ["3. Submit", "Automated checks run, then an OrbitCRM admin reviews and approves your app for the Marketplace."]].map(([t, d]) => (
          <div key={t} className="card p-4"><p className="font-semibold">{t}</p><p className="text-sm text-muted">{d}</p></div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((a) => (
          <Link key={String(a._id)} href={`/developer/apps/${a._id}`} className="card p-5 hover:border-brand">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{a.icon}</span>
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{a.name}</p><p className="text-xs text-muted">{a.installs} installs</p></div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[a.status]}`}>{a.status.replace("_", " ")}</span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-muted">{a.tagline || "No tagline yet"}</p>
          </Link>
        ))}
      </div>
      {apps.length === 0 && <p className="text-center text-sm text-muted">No apps yet — create your first one. Look at the <Link href="/developer/docs" className="text-brand">docs</Link> and the two reference apps (Softphone, Lead Scorer) in the Marketplace for working examples.</p>}
    </div>
  );
}
