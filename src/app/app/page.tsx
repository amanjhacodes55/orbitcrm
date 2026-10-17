import Link from "next/link";
import { Bot, CalendarClock, Phone, Plus, Store, TrendingUp, Workflow, Zap } from "lucide-react";
import { requireCtx } from "@/lib/context";
import { Activity, Automation, AutomationRun, Board, Installation, Item } from "@/lib/models";
import { Types } from "mongoose";
import { displayValue } from "@/lib/values";
import Orbi from "@/components/art/Orbi";
import { Sparkles } from "@/components/art/Scenes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };

export default async function Home() {
  const ctx = await requireCtx();
  const ws = new Types.ObjectId(ctx.workspace.id);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const [boards, autos, runsWeek, installs, recent, callsWeek] = await Promise.all([
    Board.find({ workspace: ws }).sort({ position: 1 }).lean(),
    Automation.countDocuments({ workspace: ws, enabled: true }),
    AutomationRun.countDocuments({ workspace: ws, createdAt: { $gte: weekAgo }, status: "success" }),
    Installation.countDocuments({ workspace: ws, active: true }),
    Activity.find({ workspace: ws, type: { $in: ["note", "call", "created"] } }).sort({ createdAt: -1 }).limit(8).populate("item", "name board").populate("actor", "name").lean(),
    Activity.countDocuments({ workspace: ws, type: "call", createdAt: { $gte: weekAgo } }),
  ]);
  const items = await Item.find({ workspace: ws }).lean();
  const leads = boards.find((b) => b.kind === "leads");
  const deals = boards.find((b) => b.kind === "deals");

  // pipeline by stage
  let pipeline: { label: string; color: string; count: number; value: number }[] = [];
  let openValue = 0;
  if (deals) {
    const stage = deals.columns.find((c) => c.id === deals.kanbanColumn) || deals.columns.find((c) => c.type === "status");
    const money = deals.columns.find((c) => c.type === "currency");
    const dItems = items.filter((i) => String(i.board) === String(deals._id));
    pipeline = (stage?.options || []).map((o) => {
      const xs = dItems.filter((i) => (i.values as Record<string, unknown>)[stage!.id] === o.id);
      const value = money ? xs.reduce((a, i) => a + (Number((i.values as Record<string, unknown>)[money.id]) || 0), 0) : 0;
      return { label: o.label, color: o.color, count: xs.length, value };
    });
    openValue = pipeline.filter((p) => !/won|lost/i.test(p.label)).reduce((a, p) => a + p.value, 0);
  }
  const won = pipeline.find((p) => /won/i.test(p.label))?.value || 0;
  const maxCount = Math.max(1, ...pipeline.map((p) => p.count));

  // follow-ups due (date columns <= today) for items owned by me or unassigned
  const due: { id: string; board: string; boardName: string; name: string; date: string }[] = [];
  for (const b of boards) {
    const date = b.columns.find((c) => c.type === "date");
    const person = b.columns.find((c) => c.type === "person");
    if (!date) continue;
    for (const i of items.filter((x) => String(x.board) === String(b._id))) {
      const v = (i.values as Record<string, unknown>)[date.id] as string | undefined;
      const owner = person ? (i.values as Record<string, unknown>)[person.id] : null;
      if (v && v <= today && (!owner || String(owner) === ctx.user.id)) due.push({ id: String(i._id), board: String(b._id), boardName: b.name, name: i.name, date: v });
    }
  }
  due.sort((a, b) => a.date.localeCompare(b.date));

  const leadStatus = leads ? leads.columns.find((c) => c.id === leads.kanbanColumn) : null;
  const newLeads = leads && leadStatus ? items.filter((i) => String(i.board) === String(leads._id) && displayValue(leadStatus as never, (i.values as Record<string, unknown>)[leadStatus.id]) === "New").length : 0;

  const stats = [
    { label: "Open pipeline", value: `₹${openValue.toLocaleString("en-IN")}`, icon: TrendingUp, tile: "bg-tile-1", href: deals ? `/app/boards/${deals._id}` : "#" },
    { label: "Won", value: `₹${won.toLocaleString("en-IN")}`, icon: Zap, tile: "bg-tile-2", href: deals ? `/app/boards/${deals._id}` : "#" },
    { label: "New leads", value: newLeads, icon: Plus, tile: "bg-tile-3", href: leads ? `/app/boards/${leads._id}` : "#" },
    { label: "Calls this week", value: callsWeek, icon: Phone, tile: "bg-tile-4", href: "#" },
    { label: "Automation runs (7d)", value: runsWeek, icon: Bot, tile: "bg-tile-1", href: "/app/automations" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="hero-gradient relative overflow-hidden rounded-[var(--radius)] px-6 py-6 text-white shadow-pop md:px-8">
        <Sparkles className="pointer-events-none absolute inset-0 size-full" />
        <div className="relative flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {ctx.user.name.split(" ")[0]}! 👋</h1>
            <p className="mt-1 text-white/85">{due.length ? `You have ${due.length} follow-up${due.length > 1 ? "s" : ""} due — let's close some deals.` : `Everything is on track in ${ctx.workspace.name}.`}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {leads && <Link href={`/app/boards/${leads._id}`} className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold backdrop-blur hover:bg-white/30">🎯 Leads</Link>}
              {deals && <Link href={`/app/boards/${deals._id}`} className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold backdrop-blur hover:bg-white/30">💰 Pipeline</Link>}
              <Link href="/app/inbox" className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold backdrop-blur hover:bg-white/30">💬 Inbox</Link>
              <Link href="/app/my-work" className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold backdrop-blur hover:bg-white/30">✅ My work</Link>
            </div>
          </div>
          <div className="hidden shrink-0 animate-float sm:block"><Orbi pose={due.length ? "phone" : "celebrate"} size={140} /></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 transition-transform hover:-translate-y-0.5">
            <span className={`flex size-9 items-center justify-center rounded-xl ${s.tile}`}><s.icon className="size-4 text-brand" /></span>
            <p className="mt-2 text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Deals pipeline</h2>
            {deals && <Link href={`/app/boards/${deals._id}`} className="text-sm text-brand">Open board →</Link>}
          </div>
          {pipeline.length === 0 ? (
            <p className="text-sm text-muted">Create a Deals pipeline board to see this chart.</p>
          ) : (
            <div className="space-y-2.5">
              {pipeline.map((p) => (
                <div key={p.label} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 truncate">{p.label}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded bg-surface-2">
                    <div className="flex h-full items-center rounded px-2 text-xs font-semibold text-white" style={{ width: `${Math.max(6, (p.count / maxCount) * 100)}%`, background: p.color }}>
                      {p.count}
                    </div>
                  </div>
                  <span className="w-28 shrink-0 text-right text-muted">₹{p.value.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><CalendarClock className="size-4 text-warn" /> Follow-ups due</h2>
          {due.length === 0 ? <p className="text-sm text-muted">Nothing due. 🎉</p> : (
            <div className="space-y-1">
              {due.slice(0, 8).map((d) => (
                <Link key={d.id} href={`/app/boards/${d.board}?item=${d.id}`} className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-surface-2">
                  <span className="truncate">{d.name}</span>
                  <span className={d.date < today ? "text-xs text-danger" : "text-xs text-warn"}>{d.date === today ? "today" : d.date}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Recent activity</h2>
          <div className="space-y-2">
            {recent.map((a) => {
              const it = a.item as unknown as { _id: string; name: string; board: string } | null;
              return (
                <Link key={String(a._id)} href={it ? `/app/boards/${it.board}?item=${it._id}` : "#"} className="flex items-start gap-3 rounded px-2 py-1.5 text-sm hover:bg-surface-2">
                  <span>{a.type === "call" ? "📞" : a.type === "note" ? "💬" : "✨"}</span>
                  <span className="min-w-0 flex-1">
                    <b>{a.actorLabel || (a.actor as unknown as { name: string } | null)?.name || "System"}</b> {a.type === "call" ? "logged a call on" : a.type === "note" ? "commented on" : "created"} <b>{it?.name}</b>
                    {a.text && a.type !== "created" && <span className="block truncate text-muted">{a.text}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold">Your workspace</h2>
          <Link href="/app/automations" className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm hover:border-brand"><Workflow className="size-5 text-brand" /> {autos} active automations</Link>
          <Link href="/app/apps" className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm hover:border-brand"><Store className="size-5 text-brand" /> {installs} installed apps</Link>
          <Link href="/developer" className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm hover:border-brand"><Zap className="size-5 text-brand" /> Build your own app →</Link>
        </div>
      </div>
    </div>
  );
}
