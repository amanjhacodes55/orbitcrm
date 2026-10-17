"use client";
import { useMemo, useState } from "react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BoardT, ItemT } from "./types";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Chip({ item, color, onOpen }: { item: ItemT; color: string; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item._id });
  return (
    <button ref={setNodeRef} {...listeners} {...attributes} onClick={onOpen} className={clsx("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white", isDragging && "opacity-40")} style={{ background: color }} title={item.name}>
      {item.name}
    </button>
  );
}
function Day({ date, inMonth, children, onAdd }: { date: string; inMonth: boolean; children: React.ReactNode; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const isToday = date === iso(new Date());
  return (
    <div ref={setNodeRef} onDoubleClick={onAdd} className={clsx("group min-h-28 border-b border-r border-border p-1", !inMonth && "bg-surface-2/60", isOver && "bg-brand-soft")}>
      <div className="mb-1 flex items-center justify-between">
        <span className={clsx("flex size-6 items-center justify-center rounded-full text-xs", isToday ? "bg-brand font-bold text-white" : inMonth ? "" : "text-faint")}>{Number(date.slice(8))}</span>
        <button onClick={onAdd} className="hidden text-xs text-faint hover:text-brand group-hover:block" title="Add item on this day">+</button>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default function CalendarView({ board, items, dateColumn, onSetDate, onAdd, onOpen, onPickDateColumn }: {
  board: BoardT; items: ItemT[]; dateColumn: string;
  onSetDate: (id: string, date: string) => void; onAdd: (date: string) => void; onOpen: (id: string) => void; onPickDateColumn: (id: string) => void;
}) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const dates = board.columns.filter((c) => c.type === "date");
  const col = dates.find((c) => c.id === dateColumn) || dates[0];
  const status = board.columns.find((c) => c.id === board.kanbanColumn) || board.columns.find((c) => c.type === "status");
  const days = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1 - ((start.getDay() + 6) % 7)); // Monday first
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);
  if (!col) return <p className="p-8 text-sm text-muted">Add a Date column to use the calendar view.</p>;
  const byDay = new Map<string, ItemT[]>();
  let undated = 0;
  for (const it of items) {
    const v = it.values[col.id] as string | undefined;
    if (!v) { undated++; continue; }
    byDay.set(v, [...(byDay.get(v) || []), it]);
  }
  const colorOf = (it: ItemT) => status?.options.find((o) => o.id === it.values[status.id])?.color || "#579bfc";
  const onEnd = (e: DragEndEvent) => { if (e.over) onSetDate(String(e.active.id), String(e.over.id)); };
  return (
    <div className="pb-24">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="btn btn-secondary btn-sm !p-1.5" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft className="size-4" /></button>
        <button className="btn btn-secondary btn-sm" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Today</button>
        <button className="btn btn-secondary btn-sm !p-1.5" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight className="size-4" /></button>
        <h2 className="ml-2 text-lg font-bold">{cursor.toLocaleString("en", { month: "long", year: "numeric" })}</h2>
        <span className="ml-auto text-xs text-muted">{undated} without a date ·</span>
        {dates.length > 1 && <select className="input !w-auto !py-1" value={col.id} onChange={(e) => onPickDateColumn(e.target.value)}>{dates.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select>}
        {dates.length === 1 && <span className="text-xs text-muted">by {col.title}</span>}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px] overflow-hidden rounded-lg border-l border-t border-border bg-surface">
          <div className="grid grid-cols-7 border-b border-border text-xs font-semibold text-muted">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="border-r border-border px-2 py-1.5">{d}</div>)}</div>
          <DndContext sensors={sensors} onDragEnd={onEnd}>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const k = iso(d);
                const list = byDay.get(k) || [];
                return (
                  <Day key={k} date={k} inMonth={d.getMonth() === cursor.getMonth()} onAdd={() => onAdd(k)}>
                    {list.slice(0, 4).map((it) => <Chip key={it._id} item={it} color={colorOf(it)} onOpen={() => onOpen(it._id)} />)}
                    {list.length > 4 && <p className="px-1 text-[11px] text-muted">+{list.length - 4} more</p>}
                  </Day>
                );
              })}
            </div>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
