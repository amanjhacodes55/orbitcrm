"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Search } from "lucide-react";
import { api } from "@/lib/client";
import { Empty } from "@/components/ui";

type R = { items: { id: string; name: string; board: string; boardName?: string; icon?: string; match: string }[]; boards: { id: string; name: string; icon: string }[]; automations: { id: string; name: string }[]; apps: { slug: string; name: string; icon: string }[] };
type Row = { key: string; label: string; sub?: string; icon: string; href: string };

const NAV: Row[] = [
  { key: "n-home", label: "Home", icon: "🏠", href: "/app" },
  { key: "n-work", label: "My work", icon: "✅", href: "/app/my-work" },
  { key: "n-inbox", label: "Inbox", icon: "💬", href: "/app/inbox" },
  { key: "n-auto", label: "Automations", icon: "⚡", href: "/app/automations" },
  { key: "n-market", label: "Marketplace", icon: "🛍️", href: "/app/marketplace" },
  { key: "n-settings", label: "Settings", icon: "⚙️", href: "/app/settings" },
  { key: "n-dev", label: "Developer portal", icon: "🧑‍💻", href: "/developer" },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<R | null>(null);
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    const o = () => setOpen(true);
    window.addEventListener("keydown", k);
    window.addEventListener("orbit:search", o);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("orbit:search", o); };
  }, []);
  useEffect(() => { if (open) { setQ(""); setRes(null); setIdx(0); setTimeout(() => input.current?.focus(), 10); } }, [open]);
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const t = setTimeout(async () => { const r = await api<R>(`/api/search?q=${encodeURIComponent(q)}`); if (r.ok) { setRes(r.data); setIdx(0); } }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const rows: Row[] = useMemo(() => {
    if (!res) return NAV.filter((n) => n.label.toLowerCase().includes(q.toLowerCase()));
    return [
      ...res.items.map((i) => ({ key: "i" + i.id, label: i.name, sub: `${i.icon} ${i.boardName}${i.match ? ` · ${i.match}` : ""}`, icon: "📄", href: `/app/boards/${i.board}?item=${i.id}` })),
      ...res.boards.map((b) => ({ key: "b" + b.id, label: b.name, sub: "Board", icon: b.icon, href: `/app/boards/${b.id}` })),
      ...res.automations.map((a) => ({ key: "a" + a.id, label: a.name, sub: "Automation", icon: "⚡", href: `/app/automations` })),
      ...res.apps.map((a) => ({ key: "p" + a.slug, label: a.name, sub: "App", icon: a.icon, href: `/app/marketplace/${a.slug}` })),
    ];
  }, [res, q]);
  const go = (r?: Row) => { if (!r) return; setOpen(false); router.push(r.href); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div className="card animate-pop w-full max-w-xl overflow-hidden shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-faint" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads, deals, contacts, boards…"
            onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(rows.length - 1, i + 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); } if (e.key === "Enter") go(rows[idx]); }}
            className="h-12 flex-1 bg-transparent text-sm outline-none" />
          <kbd className="rounded border border-border px-1.5 text-[10px] text-faint">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {rows.length === 0 && (q.length < 2 ? <p className="p-6 text-center text-sm text-muted">Type to search</p> : <Empty art="search" title="Nothing found">Try another name, email or phone.</Empty>)}
          {rows.map((r, i) => (
            <button key={r.key} onMouseEnter={() => setIdx(i)} onClick={() => go(r)} className={clsx("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm", i === idx && "bg-brand-soft")}>
              <span>{r.icon}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{r.label}</span>{r.sub && <span className="block truncate text-xs text-muted">{r.sub}</span>}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
