import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Code2, Kanban, MessagesSquare, Phone, Store, Table2, Workflow, ArrowRight, Check } from "lucide-react";
import { sessionUserId } from "@/lib/auth";
import { Logo } from "@/components/ui";
import Orbi from "@/components/art/Orbi";
import { HeroScene, Sparkles, Blob } from "@/components/art/Scenes";
import { ThemeGrid } from "@/components/ThemePicker";

const FEATURES = [
  { icon: Table2, tile: "bg-tile-1", t: "Boards your way", d: "Typed columns, coloured groups and inline editing — spreadsheet-fast." },
  { icon: Kanban, tile: "bg-tile-2", t: "Kanban pipelines", d: "Drag deals across stages and watch totals update live." },
  { icon: CalendarDays, tile: "bg-tile-3", t: "Calendar & saved views", d: "Every board as table, kanban or calendar — with saved filters." },
  { icon: MessagesSquare, tile: "bg-tile-4", t: "One inbox", d: "Website chat, email, SMS & WhatsApp — linked to leads automatically." },
  { icon: Workflow, tile: "bg-tile-1", t: "No-code automations", d: "When this happens → do that. Catch hooks, webhooks, app actions." },
  { icon: Phone, tile: "bg-tile-2", t: "Click-to-call", d: "Dialer apps run inside the CRM and log every call." },
  { icon: Store, tile: "bg-tile-3", t: "App marketplace", d: "Install reviewed apps with OAuth and clear permissions." },
  { icon: Code2, tile: "bg-tile-4", t: "Build your own apps", d: "SDK, REST API, triggers & actions — publish to the marketplace." },
];

export default async function Landing() {
  if (await sessionUserId()) redirect("/app");
  return (
    <div className="overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-1">
          <a href="#themes" className="btn btn-ghost hidden sm:inline-flex">Themes</a>
          <Link href="/developer/docs" className="btn btn-ghost hidden sm:inline-flex">Developers</Link>
          <Link href="/login" className="btn btn-ghost">Log in</Link>
          <Link href="/register" className="btn btn-primary">Get started</Link>
        </nav>
      </header>

      {/* hero */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 pb-16 pt-6 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="chip !border-brand/30 !bg-brand-soft !py-1 !text-brand">✨ Meet Orbi — your CRM sidekick</span>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] md:text-6xl">
            Sell, chat & automate <span className="text-gradient">in one happy place.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            OrbitCRM gives you monday-style boards, Pipedrive-style pipelines, a WhatsApp-to-website inbox, HubSpot-style automations and an app marketplace — with a personality.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-primary !px-6 !py-3 text-base">Start free <ArrowRight className="size-4" /></Link>
            <a href="#themes" className="btn btn-secondary !px-6 !py-3 text-base">🎨 Try the themes</a>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {["Sample CRM in 1 click", "8 themes", "Open source"].map((x) => <li key={x} className="flex items-center gap-1.5"><Check className="size-4 text-success" /> {x}</li>)}
          </ul>
        </div>
        <HeroScene className="w-full" />
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-4xl font-extrabold">Everything a growing team needs</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-muted">Not a stack of tools taped together. One CRM, every channel, endless automations.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.t} className="card p-5 transition-transform hover:-translate-y-1">
              <span className={`flex size-11 items-center justify-center rounded-xl ${f.tile}`}><f.icon className="size-5 text-brand" /></span>
              <h3 className="mt-4 font-display text-lg font-bold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* themes showcase */}
      <section id="themes" className="relative mx-auto max-w-6xl px-5 py-16">
        <div className="card relative overflow-hidden p-8 md:p-10">
          <Blob className="pointer-events-none absolute -right-24 -top-24 w-80 opacity-80" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_1.4fr]">
            <div>
              <Orbi pose="celebrate" size={150} />
              <h2 className="mt-2 text-3xl font-extrabold">Pick a vibe. <span className="text-gradient">Change everything.</span></h2>
              <p className="mt-2 text-muted">Themes restyle colours, fonts, corners and shadows — from calm Orbit Light to PostHog-style Hedgehog Retro and glowing Neon Midnight. Try one now 👉</p>
            </div>
            <ThemeGrid />
          </div>
        </div>
      </section>

      {/* inbox + automation story */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2">
        <div className="relative flex justify-center">
          <Blob className="absolute w-96 opacity-90" color="var(--tile-2)" />
          <Sparkles className="absolute inset-0 size-full" />
          <div className="relative flex items-end gap-2"><Orbi pose="mail" size={170} /><Orbi pose="phone" size={130} /></div>
        </div>
        <div>
          <h2 className="text-3xl font-extrabold">Every conversation, already linked to the right lead.</h2>
          <ul className="mt-5 space-y-3 text-muted">
            {["Paste one script tag — get a website live chat.", "Point Twilio or your email provider at an inbound URL.", "New contacts become leads, every message lands on their timeline.", "Auto-reply, route and follow up with automations."].map((x) => (
              <li key={x} className="flex gap-3"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-brand-fg">✓</span>{x}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="hero-gradient relative overflow-hidden rounded-[var(--radius)] p-10 text-center text-white md:p-14">
          <Sparkles className="pointer-events-none absolute inset-0 size-full" />
          <div className="relative">
            <div className="mx-auto w-fit animate-float"><Orbi pose="rocket" size={130} /></div>
            <h2 className="mt-2 text-4xl font-extrabold">Ready for lift-off?</h2>
            <p className="mx-auto mt-2 max-w-md text-white/85">Create a workspace with a sample CRM, working automations and two apps — in under a minute.</p>
            <Link href="/register" className="btn mt-6 bg-white !px-7 !py-3 text-base text-[#2b2d42] hover:bg-white/90">Get started free</Link>
          </div>
        </div>
      </section>
      <footer className="border-t border-border py-6 text-center text-sm text-muted">OrbitCRM · open source · made with 💜 and a little planet named Orbi</footer>
    </div>
  );
}
