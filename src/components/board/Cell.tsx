"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ExternalLink, Mail, Phone, Star, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui";
import { useDialer } from "@/components/Dialer";
import type { Column, ItemT, Member } from "./types";

function Popover({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const c = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    setTimeout(() => document.addEventListener("mousedown", c), 0);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", c);
      document.removeEventListener("keydown", k);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} className={clsx("card animate-pop absolute left-1/2 top-full z-50 mt-1 min-w-48 -translate-x-1/2 p-1.5 shadow-pop", className)}>
      {children}
    </div>
  );
}

function TextEdit({ value, onSave, type = "text", placeholder, className }: { value: string; onSave: (v: string) => void; type?: string; placeholder?: string; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      className={clsx("h-full w-full bg-transparent px-2 text-sm outline-none focus:bg-surface focus:ring-2 focus:ring-brand/40", className)}
      value={v}
      type={type}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setV(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export default function Cell({ col, item, members, onChange, compact }: { col: Column; item: ItemT; members: Member[]; onChange: (v: unknown) => void; compact?: boolean }) {
  const v = item.values?.[col.id];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const dial = useDialer();

  switch (col.type) {
    case "status":
    case "dropdown": {
      const o = col.options.find((x) => x.id === v);
      const isStatus = col.type === "status";
      return (
        <div className="relative h-full">
          <button
            onClick={() => setOpen(true)}
            className={clsx("flex h-full w-full items-center justify-center truncate px-2 text-xs font-medium", isStatus ? "text-white" : "")}
            style={isStatus ? { background: o?.color || "var(--surface-3)", color: o ? "#fff" : "var(--faint)" } : undefined}
          >
            {isStatus ? o?.label || "" : o ? <span className="rounded-full px-2 py-0.5 text-white" style={{ background: o.color }}>{o.label}</span> : <span className="text-faint">—</span>}
          </button>
          <Popover open={open} onClose={() => setOpen(false)}>
            {col.options.map((x) => (
              <button key={x.id} onClick={() => { onChange(x.id); setOpen(false); }} className="mb-1 flex w-full items-center justify-center rounded px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" style={{ background: x.color }}>
                {x.label}
              </button>
            ))}
            <button onClick={() => { onChange(null); setOpen(false); }} className="w-full rounded px-3 py-1 text-xs text-muted hover:bg-surface-2">Clear</button>
          </Popover>
        </div>
      );
    }
    case "person": {
      const m = members.find((x) => x.id === v);
      return (
        <div className="relative flex h-full items-center justify-center">
          <button onClick={() => setOpen(true)} className="flex items-center gap-1.5" title={m?.name || "Assign"}>
            {m ? <Avatar name={m.name} image={m.image} size={24} /> : <UserPlus className="size-4 text-faint" />}
            {compact && m && <span className="text-xs">{m.name.split(" ")[0]}</span>}
          </button>
          <Popover open={open} onClose={() => setOpen(false)} className="w-56">
            {members.map((x) => (
              <button key={x.id} onClick={() => { onChange(x.id); setOpen(false); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-2">
                <Avatar name={x.name} image={x.image} size={22} />
                <span className="flex-1 truncate">{x.name}</span>
                {x.id === v && <Check className="size-4 text-brand" />}
              </button>
            ))}
            {v ? <button onClick={() => { onChange(null); setOpen(false); }} className="w-full rounded px-2 py-1 text-xs text-muted hover:bg-surface-2">Unassign</button> : null}
          </Popover>
        </div>
      );
    }
    case "date": {
      const overdue = typeof v === "string" && v < new Date().toISOString().slice(0, 10);
      return <TextEdit value={String(v ?? "")} type="date" onSave={(x) => onChange(x || null)} className={clsx("text-center", overdue && "text-danger")} />;
    }
    case "number":
    case "currency":
      return <TextEdit value={v === null || v === undefined ? "" : String(v)} type="number" placeholder={col.type === "currency" ? "₹" : ""} onSave={(x) => onChange(x === "" ? null : Number(x))} className="text-center" />;
    case "checkbox":
      return (
        <div className="flex h-full items-center justify-center">
          <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={!!v} onChange={(e) => onChange(e.target.checked)} />
        </div>
      );
    case "rating":
      return (
        <div className="flex h-full items-center justify-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => onChange(Number(v) === n ? 0 : n)} aria-label={`${n} stars`}>
              <Star className={clsx("size-3.5", Number(v) >= n ? "fill-warn text-warn" : "text-faint")} />
            </button>
          ))}
        </div>
      );
    case "phone":
    case "email":
    case "link": {
      const s = String(v ?? "");
      if (editing || !s)
        return <TextEdit value={s} type={col.type === "email" ? "email" : "text"} placeholder={!s && !editing ? "" : undefined} onSave={(x) => { onChange(x || null); setEditing(false); }} />;
      const href = col.type === "email" ? `mailto:${s}` : col.type === "link" ? (s.startsWith("http") ? s : `https://${s}`) : undefined;
      return (
        <div className="group flex h-full items-center gap-1 px-2">
          {col.type === "phone" ? (
            <button onClick={() => dial({ phone: s, itemId: item._id, itemName: item.name })} className="flex min-w-0 items-center gap-1 text-sm text-brand hover:underline" title="Call">
              <Phone className="size-3.5 shrink-0" /> <span className="truncate">{s}</span>
            </button>
          ) : (
            <a href={href} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1 text-sm text-brand hover:underline">
              {col.type === "email" ? <Mail className="size-3.5 shrink-0" /> : <ExternalLink className="size-3.5 shrink-0" />}
              <span className="truncate">{s.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
          <button onClick={() => setEditing(true)} className="ml-auto hidden shrink-0 text-xs text-faint hover:text-text group-hover:block">edit</button>
        </div>
      );
    }
    default:
      return <TextEdit value={String(v ?? "")} onSave={(x) => onChange(x || null)} />;
  }
}
