"use client";
import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight, MessageSquare, Plus, Trash2 } from "lucide-react";
import Cell from "./Cell";
import type { BoardT, Column, ItemT, Member } from "./types";

const TYPE_ICON: Record<string, string> = { text: "Aa", status: "◉", person: "👤", date: "📅", number: "#", currency: "₹", email: "@", phone: "☎", dropdown: "▾", checkbox: "☑", link: "🔗", rating: "★" };

export default function TableView({
  board, items, members, onPatchItem, onAddItem, onOpen, onDelete, onSaveBoard, onAddColumn, onEditColumns,
}: {
  board: BoardT;
  items: ItemT[];
  members: Member[];
  onPatchItem: (id: string, patch: Partial<ItemT> & { values?: Record<string, unknown> }) => void;
  onAddItem: (group: string, name: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveBoard: (patch: Partial<BoardT>) => void;
  onAddColumn: () => void;
  onEditColumns: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const nameW = 280;
  const cols: Column[] = board.columns;
  const total = nameW + cols.reduce((a, c) => a + (c.width || 150), 0) + 44;

  const toggleGroup = (gid: string) => onSaveBoard({ groups: board.groups.map((g) => (g.id === gid ? { ...g, collapsed: !g.collapsed } : g)) });
  const renameGroup = (gid: string, title: string) => title.trim() && onSaveBoard({ groups: board.groups.map((g) => (g.id === gid ? { ...g, title: title.trim() } : g)) });

  return (
    <div className="space-y-8 overflow-x-auto pb-24">
      {board.groups.map((g) => {
        const rows = items.filter((i) => i.group === g.id);
        return (
          <section key={g.id} style={{ minWidth: total }}>
            <div className="mb-1.5 flex items-center gap-2">
              <button onClick={() => toggleGroup(g.id)} style={{ color: g.color }} aria-label="Collapse group">
                {g.collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              <input
                defaultValue={g.title}
                onBlur={(e) => e.target.value !== g.title && renameGroup(g.id, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="rounded bg-transparent px-1 text-base font-semibold outline-none focus:ring-2 focus:ring-brand/40"
                style={{ color: g.color }}
              />
              <span className="text-xs text-faint">{rows.length} {rows.length === 1 ? board.itemLabel.toLowerCase() : `${board.itemLabel.toLowerCase()}s`}</span>
            </div>
            {!g.collapsed && (
              <div className="overflow-hidden rounded-md border border-border bg-surface" style={{ borderLeft: `4px solid ${g.color}` }}>
                <div className="flex border-b border-border bg-surface text-xs font-semibold text-muted">
                  <div className="sticky left-0 z-10 flex items-center bg-surface px-3 py-2" style={{ width: nameW }}>
                    {board.itemLabel}
                  </div>
                  {cols.map((c) => (
                    <button key={c.id} onClick={onEditColumns} title={`${c.title} (${c.type}) — click to edit columns`} className="flex items-center justify-center gap-1 border-l border-border px-2 py-2 hover:bg-surface-2" style={{ width: c.width || 150 }}>
                      <span className="text-faint">{TYPE_ICON[c.type]}</span>
                      <span className="truncate">{c.title}</span>
                    </button>
                  ))}
                  <button onClick={onAddColumn} className="flex w-11 items-center justify-center border-l border-border hover:bg-surface-2" aria-label="Add column" title="Add column">
                    <Plus className="size-4" />
                  </button>
                </div>
                {rows.map((it) => (
                  <div key={it._id} className="group flex h-9 border-b border-border text-sm last:border-b-0 hover:bg-surface-2/60">
                    <div className="sticky left-0 z-10 flex items-center gap-1 bg-surface pl-3 pr-1 group-hover:bg-surface-2" style={{ width: nameW }}>
                      <input
                        defaultValue={it.name}
                        key={it.name}
                        onBlur={(e) => e.target.value.trim() && e.target.value !== it.name && onPatchItem(it._id, { name: e.target.value.trim() })}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        className="min-w-0 flex-1 truncate bg-transparent outline-none focus:rounded focus:bg-surface focus:px-1 focus:ring-2 focus:ring-brand/40"
                      />
                      <button onClick={() => onOpen(it._id)} className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted opacity-0 hover:bg-brand-soft hover:text-brand group-hover:opacity-100" title="Open">
                        <MessageSquare className="size-3.5" /> Open
                      </button>
                      <button onClick={() => onDelete(it._id)} className="shrink-0 rounded p-1 text-faint opacity-0 hover:text-danger group-hover:opacity-100" title="Delete" aria-label="Delete item">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {cols.map((c) => (
                      <div key={c.id} className="border-l border-border" style={{ width: c.width || 150 }}>
                        <Cell col={c} item={it} members={members} onChange={(v) => onPatchItem(it._id, { values: { [c.id]: v } })} />
                      </div>
                    ))}
                    <div className="w-11 border-l border-border" />
                  </div>
                ))}
                <form
                  className="flex h-9"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = (draft[g.id] || "").trim();
                    if (!n) return;
                    onAddItem(g.id, n);
                    setDraft({ ...draft, [g.id]: "" });
                  }}
                >
                  <input
                    className={clsx("sticky left-0 bg-surface px-3 text-sm outline-none placeholder:text-faint focus:ring-2 focus:ring-brand/30")}
                    style={{ width: nameW }}
                    placeholder={`+ Add ${board.itemLabel.toLowerCase()}`}
                    value={draft[g.id] || ""}
                    onChange={(e) => setDraft({ ...draft, [g.id]: e.target.value })}
                  />
                </form>
              </div>
            )}
          </section>
        );
      })}
      <button
        onClick={() => onSaveBoard({ groups: [...board.groups, { id: Math.random().toString(36).slice(2, 9), title: "New group", color: ["#579bfc", "#a25ddc", "#00c875", "#fdab3d", "#e2445c"][board.groups.length % 5] }] })}
        className="btn btn-secondary btn-sm"
      >
        <Plus className="size-3.5" /> Add group
      </button>
    </div>
  );
}
