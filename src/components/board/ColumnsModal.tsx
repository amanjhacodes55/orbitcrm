"use client";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui";
import type { BoardT, Column } from "./types";

const TYPES = [
  ["text", "Text"], ["status", "Status"], ["person", "Person"], ["date", "Date"], ["number", "Number"], ["currency", "Currency"],
  ["email", "Email"], ["phone", "Phone"], ["dropdown", "Dropdown"], ["checkbox", "Checkbox"], ["link", "Link"], ["rating", "Rating"], ["relation", "Connect board (link items)"],
];
const COLORS = ["#00c875", "#fdab3d", "#e2445c", "#579bfc", "#a25ddc", "#ff642e", "#037f4c", "#c4c4c4", "#ff158a", "#9cd326"];
const rid = () => Math.random().toString(36).slice(2, 9);

export default function ColumnsModal({ open, onClose, board, onSave, startAdding, boards = [] }: { open: boolean; onClose: () => void; board: BoardT; onSave: (cols: Column[]) => void; startAdding?: boolean; boards?: { id: string; name: string; icon: string }[] }) {
  const [cols, setCols] = useState<Column[]>(board.columns);
  const [newType, setNewType] = useState("text");
  useEffect(() => {
    if (open) setCols(board.columns);
  }, [open, board.columns]);
  const upd = (i: number, p: Partial<Column>) => setCols(cols.map((c, j) => (j === i ? { ...c, ...p } : c)));
  const move = (i: number, d: number) => {
    const n = [...cols];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    setCols(n);
  };
  const add = () => {
    const label = TYPES.find((t) => t[0] === newType)![1];
    setCols([...cols, { id: rid(), title: label, type: newType, width: newType === "email" ? 200 : 150, options: newType === "status" || newType === "dropdown" ? [{ id: rid(), label: "Option 1", color: COLORS[0] }, { id: rid(), label: "Option 2", color: COLORS[1] }] : [] }]);
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit columns" wide footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { onSave(cols); onClose(); }}>Save columns</button></>}>
      <div className="space-y-3">
        {cols.map((c, i) => (
          <div key={c.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input className="input !w-48" value={c.title} onChange={(e) => upd(i, { title: e.target.value })} />
              <span className="chip">{TYPES.find((t) => t[0] === c.type)?.[1]}</span>
              <label className="flex items-center gap-1 text-xs text-muted">
                width <input type="number" className="input !w-20 !py-1" value={c.width} min={80} max={600} onChange={(e) => upd(i, { width: Number(e.target.value) })} />
              </label>
              <div className="ml-auto flex gap-1">
                <button className="btn btn-ghost btn-sm !p-1.5" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="size-3.5" /></button>
                <button className="btn btn-ghost btn-sm !p-1.5" disabled={i === cols.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="size-3.5" /></button>
                <button className="btn btn-ghost btn-sm !p-1.5 hover:!text-danger" onClick={() => confirm(`Delete column “${c.title}”? Its data is hidden.`) && setCols(cols.filter((_, j) => j !== i))} aria-label="Delete column"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
            {c.type === "relation" && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-muted">Links items from</span>
                <select className="input !w-auto !py-1" value={c.relationBoard || ""} onChange={(e) => upd(i, { relationBoard: e.target.value })}>
                  <option value="">— choose a board —</option>
                  {boards.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
                </select>
              </div>
            )}
            {(c.type === "status" || c.type === "dropdown") && (
              <div className="mt-2 flex flex-wrap gap-2">
                {c.options.map((o, oi) => (
                  <div key={o.id} className="flex items-center gap-1 rounded-md border border-border p-1">
                    <input type="color" value={o.color} onChange={(e) => upd(i, { options: c.options.map((x, k) => (k === oi ? { ...x, color: e.target.value } : x)) })} className="size-6 cursor-pointer rounded border-0 bg-transparent" />
                    <input className="w-28 bg-transparent text-sm outline-none" value={o.label} onChange={(e) => upd(i, { options: c.options.map((x, k) => (k === oi ? { ...x, label: e.target.value } : x)) })} />
                    <button onClick={() => upd(i, { options: c.options.filter((_, k) => k !== oi) })} className="text-faint hover:text-danger" aria-label="Remove label">×</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => upd(i, { options: [...c.options, { id: rid(), label: "New label", color: COLORS[c.options.length % COLORS.length] }] })}>
                  <Plus className="size-3.5" /> Label
                </button>
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3">
          <select className="input !w-48" value={newType} onChange={(e) => setNewType(e.target.value)} autoFocus={startAdding}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={add}><Plus className="size-4" /> Add column</button>
        </div>
      </div>
    </Modal>
  );
}
