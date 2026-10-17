"use client";
import { useState } from "react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, DragOverlay } from "@dnd-kit/core";
import clsx from "clsx";
import { Phone, Plus } from "lucide-react";
import { Avatar } from "@/components/ui";
import { useDialer } from "@/components/Dialer";
import type { BoardT, Column, ItemT, Member } from "./types";
import { displayValue } from "@/lib/values";

function Lane({ id, title, color, count, sum, children, onAdd }: { id: string; title: string; color: string; count: number; sum?: string; children: React.ReactNode; onAdd: (name: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  return (
    <div ref={setNodeRef} className={clsx("flex w-72 shrink-0 flex-col rounded-lg bg-surface-2 transition-colors", isOver && "ring-2 ring-brand")}>
      <div className="flex items-center gap-2 rounded-t-lg px-3 py-2.5 text-sm font-semibold text-white" style={{ background: color }}>
        <span className="flex-1 truncate">{title}</span>
        <span className="rounded-full bg-white/25 px-2 text-xs">{count}</span>
      </div>
      {sum && <p className="px-3 pt-2 text-xs font-semibold text-muted">{sum}</p>}
      <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">{children}</div>
      {adding ? (
        <form
          className="p-2 pt-0"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onAdd(name.trim());
            setName("");
            setAdding(false);
          }}
        >
          <input autoFocus className="input" placeholder="Name…" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => !name && setAdding(false)} />
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="m-2 mt-0 flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-muted hover:bg-surface-3">
          <Plus className="size-4" /> Add
        </button>
      )}
    </div>
  );
}

function Card({ item, board, members, onOpen, dragging }: { item: ItemT; board: BoardT; members: Member[]; onOpen?: () => void; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item._id });
  const dial = useDialer();
  const person = board.columns.find((c) => c.type === "person");
  const phone = board.columns.find((c) => c.type === "phone");
  const money = board.columns.find((c) => c.type === "currency");
  const date = board.columns.find((c) => c.type === "date");
  const extra = board.columns.filter((c) => ["text", "dropdown", "email", "number"].includes(c.type)).slice(0, 2);
  const m = person ? members.find((x) => x.id === item.values[person.id]) : null;
  const ph = phone ? String(item.values[phone.id] ?? "") : "";
  return (
    <div
      ref={dragging ? undefined : setNodeRef}
      {...(dragging ? {} : listeners)}
      {...(dragging ? {} : attributes)}
      onClick={onOpen}
      className={clsx("cursor-grab rounded-md border border-border bg-surface p-3 text-sm shadow-card hover:border-brand/50 active:cursor-grabbing", isDragging && !dragging && "opacity-30", dragging && "rotate-2 shadow-pop")}
    >
      <p className="font-semibold">{item.name}</p>
      <div className="mt-1.5 space-y-0.5 text-xs text-muted">
        {extra.map((c) => {
          const v = displayValue(c, item.values[c.id]);
          return v ? <p key={c.id} className="truncate">{c.title}: <span className="text-text">{v}</span></p> : null;
        })}
        {money && item.values[money.id] != null && <p className="font-semibold text-text">₹{Number(item.values[money.id]).toLocaleString("en-IN")}</p>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {m && <Avatar name={m.name} image={m.image} size={20} />}
        {date && item.values[date.id] ? <span className="text-xs text-faint">📅 {String(item.values[date.id])}</span> : null}
        {ph && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              dial({ phone: ph, itemId: item._id, itemName: item.name });
            }}
            className="ml-auto rounded-full bg-success/15 p-1.5 text-success hover:bg-success/25"
            title={`Call ${ph}`}
            aria-label="Call"
          >
            <Phone className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function KanbanView({ board, items, members, onPatchItem, onAddItem, onOpen, onSaveBoard }: {
  board: BoardT; items: ItemT[]; members: Member[];
  onPatchItem: (id: string, patch: { values?: Record<string, unknown> }) => void;
  onAddItem: (group: string, name: string, values?: Record<string, unknown>) => void;
  onOpen: (id: string) => void;
  onSaveBoard: (patch: Partial<BoardT>) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [active, setActive] = useState<string | null>(null);
  const statusCols = board.columns.filter((c) => c.type === "status" || c.type === "dropdown");
  const col: Column | undefined = statusCols.find((c) => c.id === board.kanbanColumn) || statusCols[0];
  if (!col) return <p className="p-8 text-sm text-muted">Add a Status column to use the kanban view.</p>;
  const money = board.columns.find((c) => c.type === "currency");
  const lanes = [...col.options.map((o) => ({ id: o.id, title: o.label, color: o.color })), { id: "__none", title: "No " + col.title.toLowerCase(), color: "#c4c4c4" }];

  const onEnd = (e: DragEndEvent) => {
    setActive(null);
    if (!e.over) return;
    const lane = String(e.over.id);
    const it = items.find((i) => i._id === e.active.id);
    if (!it) return;
    const next = lane === "__none" ? null : lane;
    if ((it.values[col.id] ?? null) !== next) onPatchItem(it._id, { values: { [col.id]: next } });
  };

  return (
    <div>
      {statusCols.length > 1 && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-muted">Lanes by</span>
          <select className="input !w-auto !py-1" value={col.id} onChange={(e) => onSaveBoard({ kanbanColumn: e.target.value })}>
            {statusCols.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      )}
      <DndContext sensors={sensors} onDragStart={(e) => setActive(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
        <div className="flex gap-3 overflow-x-auto pb-24">
          {lanes.map((l) => {
            const cards = items.filter((i) => (l.id === "__none" ? !col.options.some((o) => o.id === i.values[col.id]) : i.values[col.id] === l.id));
            if (l.id === "__none" && cards.length === 0) return null;
            const sum = money ? cards.reduce((a, c) => a + (Number(c.values[money.id]) || 0), 0) : 0;
            return (
              <Lane key={l.id} id={l.id} title={l.title} color={l.color} count={cards.length} sum={money && sum ? `₹${sum.toLocaleString("en-IN")}` : undefined}
                onAdd={(name) => onAddItem(board.groups[0].id, name, l.id === "__none" ? {} : { [col.id]: l.id })}>
                {cards.map((c) => <Card key={c._id} item={c} board={board} members={members} onOpen={() => onOpen(c._id)} />)}
              </Lane>
            );
          })}
        </div>
        <DragOverlay>{active ? <Card item={items.find((i) => i._id === active)!} board={board} members={members} dragging /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
