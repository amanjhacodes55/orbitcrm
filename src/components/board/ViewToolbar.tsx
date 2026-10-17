"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowDownUp, EyeOff, Filter as FilterIcon, Plus, Trash2, X } from "lucide-react";
import { opsFor, type Filter, type ViewT } from "@/lib/filters";
import type { Column, Member } from "./types";

function Pop({ label, icon, count, children, width = 520 }: { label: string; icon: React.ReactNode; count?: number; children: React.ReactNode; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const c = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", c);
    return () => document.removeEventListener("mousedown", c);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={clsx("btn btn-sm", count ? "bg-brand-soft text-brand" : "btn-ghost")}>
        {icon} {label}{count ? ` · ${count}` : ""}
      </button>
      {open && <div className="card animate-pop absolute left-0 top-9 z-50 max-w-[calc(100vw-2rem)] p-4 shadow-pop" style={{ width }}>{children}</div>}
    </div>
  );
}

const NO_VALUE = ["is_empty", "not_empty", "me", "checked", "unchecked", "today", "overdue", "this_week"];

function FilterValue({ col, f, members, onChange }: { col?: Column; f: Filter; members: Member[]; onChange: (v: unknown) => void }) {
  if (NO_VALUE.includes(f.op)) return <span />;
  if (col && (col.type === "status" || col.type === "dropdown" || col.type === "person") && (f.op === "in" || f.op === "not_in")) {
    const opts = col.type === "person" ? members.map((m) => ({ id: m.id, label: m.name, color: "#579bfc" })) : col.options;
    const sel = Array.isArray(f.value) ? (f.value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-1">
        {opts.map((o) => (
          <button key={o.id} onClick={() => onChange(sel.includes(o.id) ? sel.filter((x) => x !== o.id) : [...sel, o.id])} className={clsx("rounded-full border px-2 py-0.5 text-xs", sel.includes(o.id) ? "border-transparent text-white" : "border-border")} style={sel.includes(o.id) ? { background: o.color } : undefined}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  const type = col?.type === "date" ? "date" : ["number", "currency", "rating"].includes(col?.type || "") ? "number" : "text";
  return <input className="input !py-1" type={type} value={String(f.value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder="Value" />;
}

export default function ViewToolbar({ view, columns, members, onChange }: { view: ViewT; columns: Column[]; members: Member[]; onChange: (patch: Partial<ViewT>) => void }) {
  const allCols = [{ id: "name", title: "Name", type: "text", width: 0, options: [] } as Column, ...columns];
  const setF = (i: number, p: Partial<Filter>) => onChange({ filters: view.filters.map((f, j) => (j === i ? { ...f, ...p } : f)) });
  const active = view.filters.filter((f) => f.column && f.op).length;
  return (
    <>
      <Pop label="Filter" icon={<FilterIcon className="size-3.5" />} count={active}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Show items where</p>
          {view.filters.length > 1 && (
            <select className="input !w-auto !py-1 text-xs" value={view.match} onChange={(e) => onChange({ match: e.target.value as "all" | "any" })}>
              <option value="all">all conditions match</option>
              <option value="any">any condition matches</option>
            </select>
          )}
        </div>
        <div className="space-y-2">
          {view.filters.map((f, i) => {
            const col = allCols.find((c) => c.id === f.column);
            return (
              <div key={i} className="grid grid-cols-[140px_150px_1fr_auto] items-start gap-2">
                <select className="input !py-1" value={f.column} onChange={(e) => { const c = allCols.find((x) => x.id === e.target.value); setF(i, { column: e.target.value, op: opsFor(c?.type || "text")[0][0], value: undefined }); }}>
                  {allCols.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <select className="input !py-1" value={f.op} onChange={(e) => setF(i, { op: e.target.value })}>
                  {opsFor(col?.type || "text").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <FilterValue col={col} f={f} members={members} onChange={(v) => setF(i, { value: v })} />
                <button className="btn btn-ghost btn-sm !p-1.5" onClick={() => onChange({ filters: view.filters.filter((_, j) => j !== i) })} aria-label="Remove filter"><X className="size-3.5" /></button>
              </div>
            );
          })}
          {view.filters.length === 0 && <p className="text-xs text-muted">No filters. This view shows every item.</p>}
        </div>
        <div className="mt-3 flex justify-between">
          <button className="btn btn-secondary btn-sm" onClick={() => onChange({ filters: [...view.filters, { column: columns[0]?.id || "name", op: opsFor(columns[0]?.type || "text")[0][0] }] })}><Plus className="size-3.5" /> Add filter</button>
          {view.filters.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => onChange({ filters: [] })}><Trash2 className="size-3.5" /> Clear all</button>}
        </div>
        <p className="mt-3 text-[11px] text-faint">Filters are saved to this view for everyone in the workspace.</p>
      </Pop>
      <Pop label="Sort" icon={<ArrowDownUp className="size-3.5" />} count={view.sort.column ? 1 : 0} width={320}>
        <p className="mb-2 text-sm font-semibold">Sort by</p>
        <div className="flex gap-2">
          <select className="input !py-1" value={view.sort.column} onChange={(e) => onChange({ sort: { ...view.sort, column: e.target.value } })}>
            <option value="">Manual order</option>
            <option value="name">Name</option>
            <option value="createdAt">Created</option>
            <option value="updatedAt">Last updated</option>
            {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select className="input !w-28 !py-1" value={view.sort.dir} onChange={(e) => onChange({ sort: { ...view.sort, dir: e.target.value as "asc" | "desc" } })}>
            <option value="asc">Asc ↑</option>
            <option value="desc">Desc ↓</option>
          </select>
        </div>
      </Pop>
      <Pop label="Hide" icon={<EyeOff className="size-3.5" />} count={view.hidden.length} width={280}>
        <p className="mb-2 text-sm font-semibold">Visible columns</p>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {columns.map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-surface-2">
              <input type="checkbox" className="accent-[var(--brand)]" checked={!view.hidden.includes(c.id)} onChange={(e) => onChange({ hidden: e.target.checked ? view.hidden.filter((x) => x !== c.id) : [...view.hidden, c.id] })} />
              {c.title}
            </label>
          ))}
        </div>
      </Pop>
    </>
  );
}
