"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  Bell, Boxes, ChevronDown, Code2, Home, LogOut, Menu, Moon, Plus, Settings, ShieldCheck, Store, Sun, Workflow, X, Check, PlusCircle,
} from "lucide-react";
import { Avatar, Logo, Modal, timeAgo } from "@/components/ui";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import type { Ctx } from "@/lib/context";

type B = { id: string; name: string; icon: string };

const TEMPLATES = [
  { key: "leads", icon: "🎯", name: "Leads", desc: "Capture & qualify leads" },
  { key: "deals", icon: "💰", name: "Deals pipeline", desc: "Stages, values, close dates" },
  { key: "contacts", icon: "👥", name: "Contacts", desc: "People you work with" },
  { key: "companies", icon: "🏢", name: "Companies", desc: "Accounts & organisations" },
  { key: "custom", icon: "📋", name: "Blank board", desc: "Start from scratch" },
];

export default function Shell({ ctx, boards, workspaces, children }: { ctx: Ctx; boards: B[]; workspaces: { id: string; name: string }[]; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [mobile, setMobile] = useState(false);
  const [newBoard, setNewBoard] = useState(false);
  const [wsMenu, setWsMenu] = useState(false);
  const [theme, setTheme] = useState("light");
  useEffect(() => setTheme(document.documentElement.dataset.theme || "light"), []);
  useEffect(() => setMobile(false), [path]);

  const toggleTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("orbit-theme", t);
    } catch {}
    setTheme(t);
  };

  async function createBoard(template: string) {
    const r = await api<{ id: string }>("/api/boards", { method: "POST", json: { template } });
    if (!r.ok) return toast(r.error, "error");
    setNewBoard(false);
    router.push(`/app/boards/${r.data.id}`);
    router.refresh();
  }
  async function switchWs(id: string) {
    await api("/api/workspaces/switch", { method: "POST", json: { id } });
    setWsMenu(false);
    router.push("/app");
    router.refresh();
  }

  const nav = (href: string, label: string, Icon: typeof Home, exact = false) => {
    const active = exact ? path === href : path.startsWith(href);
    return (
      <Link key={href} href={href} className={clsx("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm", active ? "bg-brand-soft font-semibold text-brand" : "text-text hover:bg-surface-2")}>
        <Icon className="size-4" /> {label}
      </Link>
    );
  };

  const sidebar = (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center px-4">
        <Link href="/app">
          <Logo />
        </Link>
      </div>
      <div className="relative px-3">
        <button onClick={() => setWsMenu((v) => !v)} className="flex w-full items-center gap-2 rounded-md border border-border px-2.5 py-2 text-left text-sm hover:bg-surface-2">
          <span className="flex size-6 items-center justify-center rounded bg-brand text-xs font-bold text-white">{ctx.workspace.name[0]?.toUpperCase()}</span>
          <span className="flex-1 truncate font-semibold">{ctx.workspace.name}</span>
          <ChevronDown className="size-4 text-muted" />
        </button>
        {wsMenu && (
          <div className="card animate-pop absolute inset-x-3 top-11 z-50 p-1 shadow-pop">
            {workspaces.map((w) => (
              <button key={w.id} onClick={() => switchWs(w.id)} className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm hover:bg-surface-2">
                <span className="flex-1 truncate">{w.name}</span>
                {w.id === ctx.workspace.id && <Check className="size-4 text-brand" />}
              </button>
            ))}
            <Link href="/onboarding" className="flex items-center gap-2 rounded border-t border-border px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2">
              <PlusCircle className="size-4" /> New workspace
            </Link>
          </div>
        )}
      </div>
      <nav className="mt-3 space-y-0.5 px-3">
        {nav("/app", "Home", Home, true)}
        {nav("/app/automations", "Automations", Workflow)}
        {nav("/app/marketplace", "Marketplace", Store)}
        {nav("/app/apps", "Installed apps", Boxes)}
        {nav("/app/settings", "Settings", Settings)}
      </nav>
      <div className="mt-5 flex items-center justify-between px-5 text-xs font-semibold uppercase tracking-wide text-faint">
        Boards
        <button onClick={() => setNewBoard(true)} className="rounded p-0.5 hover:bg-surface-2 hover:text-text" aria-label="New board">
          <Plus className="size-4" />
        </button>
      </div>
      <div className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {boards.map((b) => (
          <Link key={b.id} href={`/app/boards/${b.id}`} className={clsx("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm", path.startsWith(`/app/boards/${b.id}`) ? "bg-brand-soft font-semibold text-brand" : "hover:bg-surface-2")}>
            <span>{b.icon}</span>
            <span className="truncate">{b.name}</span>
          </Link>
        ))}
        <button onClick={() => setNewBoard(true)} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2">
          <Plus className="size-4" /> Add board
        </button>
      </div>
      <div className="space-y-0.5 border-t border-border p-3">
        <Link href="/developer" className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-text">
          <Code2 className="size-4" /> Developer portal
        </Link>
        {ctx.isPlatformAdmin && (
          <Link href="/admin/apps" className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-text">
            <ShieldCheck className="size-4" /> App review (admin)
          </Link>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:block">{sidebar}</div>
      {mobile && (
        <div className="fixed inset-0 z-[80] flex md:hidden">
          {sidebar}
          <button className="flex-1 bg-black/40" onClick={() => setMobile(false)} aria-label="Close menu" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 md:px-5">
          <button className="btn btn-ghost btn-sm !p-2 md:hidden" onClick={() => setMobile(true)} aria-label="Menu">
            {mobile ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <div className="flex-1" />
          <button onClick={toggleTheme} className="btn btn-ghost btn-sm !p-2" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Bell_ />
          <UserMenu ctx={ctx} />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
      <Modal open={newBoard} onClose={() => setNewBoard(false)} title="Create a board">
        <div className="grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button key={t.key} onClick={() => createBoard(t.key)} className="flex items-start gap-3 rounded-lg border border-border p-3 text-left hover:border-brand hover:bg-brand-soft/40">
              <span className="text-2xl">{t.icon}</span>
              <span>
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="text-xs text-muted">{t.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function Bell_() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ unread: number; items: { id: string; text: string; link: string; read: boolean; createdAt: string }[] }>({ unread: 0, items: [] });
  const ref = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const r = await api<typeof data>("/api/notifications");
    if (r.ok) setData(r.data);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    const c = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", c);
    return () => {
      clearInterval(t);
      document.removeEventListener("mousedown", c);
    };
  }, [load]);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={async () => {
          setOpen(!open);
          if (!open && data.unread) {
            await api("/api/notifications", { method: "POST" });
            setData((d) => ({ ...d, unread: 0 }));
          }
        }}
        className="btn btn-ghost btn-sm relative !p-2"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {data.unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-danger px-1 text-[10px] font-bold text-white">{data.unread}</span>}
      </button>
      {open && (
        <div className="card animate-pop absolute right-0 top-10 z-50 w-80 overflow-hidden shadow-pop">
          <p className="border-b border-border px-4 py-2.5 text-sm font-semibold">Notifications</p>
          <div className="max-h-96 overflow-y-auto">
            {data.items.length === 0 && <p className="p-6 text-center text-sm text-muted">You&apos;re all caught up.</p>}
            {data.items.map((n) => (
              <Link key={n.id} href={n.link || "#"} onClick={() => setOpen(false)} className={clsx("block border-b border-border px-4 py-2.5 text-sm last:border-0 hover:bg-surface-2", !n.read && "bg-brand-soft/40")}>
                {n.text}
                <span className="block text-xs text-faint">{timeAgo(n.createdAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ ctx }: { ctx: Ctx }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", c);
    return () => document.removeEventListener("mousedown", c);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="rounded-full ring-brand/40 hover:ring-2" aria-label="Account">
        <Avatar name={ctx.user.name} image={ctx.user.image} size={30} />
      </button>
      {open && (
        <div className="card animate-pop absolute right-0 top-10 z-50 w-56 p-1.5 shadow-pop">
          <div className="border-b border-border px-2.5 pb-2 pt-1">
            <p className="truncate text-sm font-semibold">{ctx.user.name}</p>
            <p className="truncate text-xs text-muted">{ctx.user.email}</p>
          </div>
          <Link href="/app/settings" className="flex items-center gap-2 rounded px-2.5 py-1.5 text-sm hover:bg-surface-2">
            <Settings className="size-4 text-muted" /> Workspace settings
          </Link>
          <Link href="/developer" className="flex items-center gap-2 rounded px-2.5 py-1.5 text-sm hover:bg-surface-2">
            <Code2 className="size-4 text-muted" /> Developer portal
          </Link>
          <button
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.href = "/";
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-sm text-danger hover:bg-surface-2"
          >
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
