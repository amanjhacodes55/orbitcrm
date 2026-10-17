import Link from "next/link";
import { redirect } from "next/navigation";
import { Kanban, Phone, Store, Table2, Webhook, Workflow, Code2, ShieldCheck } from "lucide-react";
import { sessionUserId } from "@/lib/auth";
import { Logo } from "@/components/ui";

const F = [
  { icon: Table2, t: "Grid boards", d: "Spreadsheet-fast tables with typed columns: status, people, dates, money, phone, ratings." },
  { icon: Kanban, t: "Kanban pipelines", d: "Drag deals across stages. Totals per stage update live." },
  { icon: Workflow, t: "Automations", d: "When X happens → do Y. Column changes, new items, app triggers and catch hooks." },
  { icon: Webhook, t: "Webhooks & API", d: "Signed outgoing webhooks, catch-hook URLs, API keys and a full REST API." },
  { icon: Phone, t: "Built-in dialer", d: "Click any phone number. Dialer apps run inside the CRM and log calls automatically." },
  { icon: Store, t: "App marketplace", d: "Install apps with one click — with OAuth, scopes and a permissions screen." },
  { icon: Code2, t: "Developer platform", d: "Build apps with settings pages, dialers, item panels, triggers and actions." },
  { icon: ShieldCheck, t: "Reviewed apps", d: "Every app passes automated checks and an admin review before it's listed." },
];

export default async function Landing() {
  if (await sessionUserId()) redirect("/app");
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-soft/70 via-bg to-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex gap-2">
          <Link href="/developer/docs" className="btn btn-ghost">Developers</Link>
          <Link href="/login" className="btn btn-ghost">Log in</Link>
          <Link href="/register" className="btn btn-primary">Get started</Link>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-5 pb-14 pt-12 text-center">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          The CRM you can <span className="text-brand">shape</span>, automate and extend.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          Boards like monday.com, pipelines like Pipedrive, automations and an app platform like HubSpot — in one open-source CRM.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn btn-primary !px-6 !py-3 text-base">Start free — sample CRM included</Link>
          <Link href="/developer/docs" className="btn btn-secondary !px-6 !py-3 text-base">Read the API docs</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {F.map((f) => (
          <div key={f.t} className="card p-5">
            <f.icon className="size-5 text-brand" />
            <h3 className="mt-3 font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
