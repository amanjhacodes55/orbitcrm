"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Link2, Plus, X } from "lucide-react";
import { api } from "@/lib/client";

const nameCache = new Map<string, string>(); // itemId -> name (shared across cells)
const pending = new Map<string, Promise<void>>();

async function resolve(board: string, ids: string[]) {
  const missing = ids.filter((i) => !nameCache.has(i));
  if (!missing.length) return;
  const key = board + missing.join(",");
  if (!pending.has(key)) pending.set(key, api<{ items: { id: string; name: string }[] }>(`/api/boards/${board}/lookup?ids=${missing.join(",")}`).then((r) => { (r.data.items || []).forEach((x) => nameCache.set(x.id, x.name)); }));
  await pending.get(key);
}

export default function RelationCell({ board, value, onChange, compact }: { board?: string; value: unknown; onChange: (v: string[]) => void; compact?: boolean }) {
  const ids = Array.isArray(value) ? (value as string[]) : [];
  const [, force] = useState(0);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ id: string; name: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (board && ids.length) resolve(board, ids).then(() => force((x) => x + 1)); }, [board, ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open || !board) return;
    const t = setTimeout(async () => { const r = await api<{ items: { id: string; name: string }[] }>(`/api/boards/${board}/lookup?q=${encodeURIComponent(q)}`); setRes(r.data.items || []); r.data.items?.forEach((x) => nameCache.set(x.id, x.name)); }, 200);
    return () => clearTimeout(t);
  }, [open, q, board]);
  useEffect(() => {
    if (!open) return;
    const c = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    setTimeout(() => document.addEventListener("mousedown", c), 0);
    return () => document.removeEventListener("mousedown", c);
  }, [open]);
  if (!board) return <span className="px-2 text-xs text-faint">Pick a board in column settings</span>;
  return (
    <div ref={ref} className="relative flex h-full items-center gap-1 overflow-hidden px-1.5">
      {ids.slice(0, compact ? 6 : 2).map((id) => (
        <Link key={id} href={`/app/boards/${board}?item=${id}`} className="flex max-w-[120px] shrink-0 items-center gap-1 truncate rounded bg-brand-soft px-1.5 py-0.5 text-xs text-brand hover:underline">
          <Link2 className="size-3 shrink-0" /> <span className="truncate">{nameCache.get(id) || "…"}</span>
        </Link>
      ))}
      {!compact && ids.length > 2 && <span className="text-xs text-muted">+{ids.length - 2}</span>}
      <button onClick={() => setOpen(true)} className="ml-auto shrink-0 rounded p-0.5 text-faint hover:bg-surface-2 hover:text-text" aria-label="Link item"><Plus className="size-3.5" /></button>
      {open && (
        <div className="card animate-pop absolute left-0 top-full z-50 mt-1 w-64 p-2 shadow-pop">
          <input autoFocus className="input !py-1" placeholder="Search to link…" value={q} onChange={(e) => setQ(e.target.value)} />
          {ids.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {ids.map((id) => <span key={id} className="flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs">{nameCache.get(id) || "…"}<button onClick={() => onChange(ids.filter((x) => x !== id))} aria-label="Unlink"><X className="size-3" /></button></span>)}
            </div>
          )}
          <div className="mt-2 max-h-52 overflow-y-auto">
            {res.filter((r) => !ids.includes(r.id)).map((r) => <button key={r.id} onClick={() => onChange([...ids, r.id])} className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-surface-2">{r.name}</button>)}
            {res.length === 0 && <p className="px-2 py-2 text-xs text-muted">No items found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
