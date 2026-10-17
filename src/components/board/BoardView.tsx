"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { CalendarDays, Columns3, Copy, Download, Kanban, MoreHorizontal, Plus, Search, Table2, Trash2, Upload, Workflow, X } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { Avatar, Modal } from "@/components/ui";
import TableView from "./TableView";
import KanbanView from "./KanbanView";
import CalendarView from "./CalendarView";
import ItemDrawer from "./ItemDrawer";
import ColumnsModal from "./ColumnsModal";
import ImportModal from "./ImportModal";
import ViewToolbar from "./ViewToolbar";
import Cell from "./Cell";
import { displayValue } from "@/lib/values";
import { applyView, defaultViews, type ViewT } from "@/lib/filters";
import type { BoardT, Column, ItemT, Member, PanelApp } from "./types";

const VIEW_ICON = { table: Table2, kanban: Kanban, calendar: CalendarDays };

export default function BoardView({ initialBoard, initialItems, members, panelApps, user, workspace, canAdmin, boards }: {
  initialBoard: BoardT; initialItems: ItemT[]; members: Member[]; panelApps: PanelApp[]; user: { id: string } & Record<string, unknown>; workspace: Record<string, unknown>; canAdmin: boolean;
  boards: { id: string; name: string; icon: string }[];
}) {
  const toast = useToast();
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [board, setBoard] = useState(initialBoard);
  const [items, setItems] = useState(initialItems);
  const [q, setQ] = useState("");
  const [person, setPerson] = useState("");
  const [colsOpen, setColsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSet, setBulkSet] = useState<Column | null>(null);
  const [newView, setNewView] = useState(false);
  const openId = sp.get("item");

  useEffect(() => { setBoard(initialBoard); setItems(initialItems); setSelected(new Set()); }, [initialBoard, initialItems]);

  const views: ViewT[] = board.views && board.views.length ? board.views : defaultViews(board);
  const [viewId, setViewId] = useState<string>(views[0].id);
  useEffect(() => {
    try {
      const v = localStorage.getItem(`orbit-view2:${initialBoard._id}`);
      const list = initialBoard.views?.length ? initialBoard.views : defaultViews(initialBoard);
      if (v && list.some((x) => x.id === v)) setViewId(v);
      else setViewId(initialBoard.kind === "deals" ? list.find((x) => x.type === "kanban")?.id || list[0].id : list[0].id);
    } catch {}
  }, [initialBoard]);
  const view = views.find((v) => v.id === viewId) || views[0];
  const pickView = (id: string) => { setViewId(id); setSelected(new Set()); try { localStorage.setItem(`orbit-view2:${board._id}`, id); } catch {} };

  const setOpen = (id: string | null) => {
    const u = new URLSearchParams(sp.toString());
    if (id) u.set("item", id); else u.delete("item");
    router.replace(`${path}${u.size ? "?" + u : ""}`, { scroll: false });
  };

  const refresh = useCallback(async () => {
    const r = await api<{ board: BoardT; items: ItemT[] }>(`/api/boards/${board._id}`);
    if (r.ok) { setBoard(r.data.board); setItems(r.data.items); }
  }, [board._id]);
  useEffect(() => {
    const f = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [refresh]);

  const saveBoard = useCallback(async (patch: Partial<BoardT>) => {
    setBoard((b) => ({ ...b, ...patch }));
    const r = await api<{ board: BoardT }>(`/api/boards/${board._id}`, { method: "PATCH", json: patch });
    if (!r.ok) { toast(r.error, "error"); refresh(); return; }
    setBoard(r.data.board);
    if (patch.name || patch.icon) router.refresh();
  }, [board._id, toast, refresh, router]);

  // debounce view saves (filters change on every keystroke)
  const viewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateView = (patch: Partial<ViewT>) => {
    const next = views.map((v) => (v.id === view.id ? { ...v, ...patch } : v));
    setBoard((b) => ({ ...b, views: next }));
    if (viewTimer.current) clearTimeout(viewTimer.current);
    viewTimer.current = setTimeout(() => saveBoard({ views: next }), 600);
  };

  const patchItem = async (id: string, patch: { name?: string; group?: string; values?: Record<string, unknown> }) => {
    const prev = items;
    setItems((xs) => xs.map((x) => (x._id === id ? { ...x, ...patch, values: { ...x.values, ...(patch.values || {}) } } : x)));
    const r = await api<{ item: ItemT }>(`/api/items/${id}`, { method: "PATCH", json: patch });
    if (!r.ok) { setItems(prev); return toast(r.error, "error"); }
    setItems((xs) => xs.map((x) => (x._id === id ? r.data.item : x)));
    if (patch.values) setTimeout(refresh, 400);
  };
  const addItem = async (group: string, name: string, values?: Record<string, unknown>) => {
    const r = await api<{ item: ItemT }>(`/api/boards/${board._id}/items`, { method: "POST", json: { name, group, values } });
    if (!r.ok) return toast(r.error, "error");
    setItems((xs) => [r.data.item, ...xs]);
    setTimeout(refresh, 600);
    return r.data.item;
  };
  const deleteItem = async (id: string) => {
    const prev = items;
    setItems((xs) => xs.filter((x) => x._id !== id));
    if (openId === id) setOpen(null);
    const r = await api(`/api/items/${id}`, { method: "DELETE" });
    if (!r.ok) { setItems(prev); toast(r.error, "error"); }
  };
  const bulk = async (body: Record<string, unknown>, msg: string) => {
    const ids = [...selected];
    const r = await api<{ done: number }>(`/api/boards/${board._id}/bulk`, { method: "POST", json: { ids, ...body } });
    if (!r.ok) return toast(r.error, "error");
    toast(`${msg} ${r.data.done} item(s)`, "success");
    setSelected(new Set());
    refresh();
  };
  const deleteBoard = async () => {
    if (!confirm(`Delete the board “${board.name}” with ${items.length} items, its automations and activity? This can't be undone.`)) return;
    const r = await api(`/api/boards/${board._id}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, "error");
    router.push("/app");
    router.refresh();
  };

  const userNames = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);
  const personCol = board.columns.find((c) => c.type === "person");
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    const pre = items.filter((it) => {
      if (person && personCol && it.values[personCol.id] !== person) return false;
      if (!s) return true;
      return it.name.toLowerCase().includes(s) || board.columns.some((c) => (c.type === "person" ? userNames[String(it.values[c.id])] || "" : displayValue(c, it.values[c.id])).toLowerCase().includes(s));
    });
    return applyView(pre, view, board.columns, user.id, userNames);
  }, [items, q, person, personCol, board.columns, view, user.id, userNames]);

  const exportCsv = () => {
    const cols = board.columns.filter((c) => !view.hidden.includes(c.id));
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = [["Name", "Group", ...cols.map((c) => c.title)].map(esc).join(",")];
    for (const it of filtered) rows.push([it.name, board.groups.find((g) => g.id === it.group)?.title || "", ...cols.map((c) => (c.type === "person" ? userNames[String(it.values[c.id])] || "" : displayValue(c, it.values[c.id])))].map((x) => esc(String(x))).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    a.download = `${board.name} - ${view.name}.csv`;
    a.click();
  };
  const addView = (type: ViewT["type"]) => {
    const base = defaultViews(board)[0];
    const v: ViewT = { ...base, id: Math.random().toString(36).slice(2, 9), name: type === "table" ? "New table view" : type === "kanban" ? "New kanban" : "New calendar", type, kanbanColumn: board.kanbanColumn, dateColumn: board.columns.find((c) => c.type === "date")?.id || "" };
    const next = [...views, v];
    saveBoard({ views: next });
    pickView(v.id);
    setNewView(false);
  };
  const renameView = (v: ViewT) => {
    const name = prompt("View name", v.name);
    if (name?.trim()) saveBoard({ views: views.map((x) => (x.id === v.id ? { ...x, name: name.trim() } : x)) });
  };
  const deleteView = (v: ViewT) => {
    if (views.length <= 1) return toast("A board needs at least one view", "error");
    if (!confirm(`Delete view “${v.name}”?`)) return;
    const next = views.filter((x) => x.id !== v.id);
    saveBoard({ views: next });
    pickView(next[0].id);
  };
  const openItem = items.find((i) => i._id === openId);
  const dateCol = view.dateColumn || board.columns.find((c) => c.type === "date")?.id || "";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-surface px-4 pt-4 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <input defaultValue={board.icon} key={`i${board.icon}`} maxLength={4} onBlur={(e) => e.target.value && e.target.value !== board.icon && saveBoard({ icon: e.target.value })} className="w-10 rounded bg-transparent text-center text-2xl outline-none focus:ring-2 focus:ring-brand/40" aria-label="Board icon" />
          <input defaultValue={board.name} key={`n${board.name}`} onBlur={(e) => e.target.value.trim() && e.target.value !== board.name && saveBoard({ name: e.target.value.trim() })} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="min-w-0 flex-1 rounded bg-transparent text-2xl font-bold outline-none focus:ring-2 focus:ring-brand/40" aria-label="Board name" />
          <Link href={`/app/automations?board=${board._id}`} className="btn btn-secondary btn-sm"><Workflow className="size-3.5" /> Automate</Link>
          <button onClick={() => setImportOpen(true)} className="btn btn-ghost btn-sm" title="Import CSV"><Upload className="size-3.5" /> Import</button>
          <button onClick={exportCsv} className="btn btn-ghost btn-sm" title="Export this view as CSV"><Download className="size-3.5" /> Export</button>
          {canAdmin && <button onClick={deleteBoard} className="btn btn-ghost btn-sm hover:!text-danger" title="Delete board" aria-label="Delete board"><Trash2 className="size-3.5" /></button>}
        </div>
        <p className="mt-0.5 pl-12 text-sm text-muted">{board.description}</p>
        <div className="mt-3 flex items-center gap-1 overflow-x-auto">
          {views.map((v) => {
            const I = VIEW_ICON[v.type];
            return (
              <div key={v.id} className="group relative flex shrink-0 items-center">
                <button onClick={() => pickView(v.id)} onDoubleClick={() => renameView(v)} className={clsx("relative flex items-center gap-1.5 px-3 py-2 text-sm", view.id === v.id ? "font-semibold text-text" : "text-muted hover:text-text")}>
                  <I className="size-4" /> {v.name}
                  {v.filters.length > 0 && <span className="size-1.5 rounded-full bg-brand" title="Filtered" />}
                  {view.id === v.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand" />}
                </button>
                {view.id === v.id && (
                  <span className="flex opacity-0 group-hover:opacity-100">
                    <button onClick={() => renameView(v)} className="rounded p-0.5 text-faint hover:text-text" title="Rename view"><MoreHorizontal className="size-3.5" /></button>
                    {views.length > 1 && <button onClick={() => deleteView(v)} className="rounded p-0.5 text-faint hover:text-danger" title="Delete view"><X className="size-3.5" /></button>}
                  </span>
                )}
              </div>
            );
          })}
          <button onClick={() => setNewView(true)} className="btn btn-ghost btn-sm shrink-0" title="Add view"><Plus className="size-3.5" /> View</button>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-brand/30 bg-brand-soft px-4 py-2 md:px-6">
          <b className="text-sm">{selected.size} selected</b>
          <select className="input !w-auto !py-1 text-sm" value="" onChange={(e) => { const c = board.columns.find((x) => x.id === e.target.value); if (c) setBulkSet(c); }}>
            <option value="">Set column…</option>
            {board.columns.filter((c) => c.type !== "relation").map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select className="input !w-auto !py-1 text-sm" value="" onChange={(e) => e.target.value && bulk({ action: "move", group: e.target.value }, "Moved")}>
            <option value="">Move to group…</option>
            {board.groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => bulk({ action: "duplicate" }, "Duplicated")}><Copy className="size-3.5" /> Duplicate</button>
          <button className="btn btn-danger btn-sm" onClick={() => confirm(`Delete ${selected.size} items?`) && bulk({ action: "delete" }, "Deleted")}><Trash2 className="size-3.5" /> Delete</button>
          <button className="btn btn-ghost btn-sm ml-auto" onClick={() => setSelected(new Set())}><X className="size-3.5" /> Clear</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-6">
          <button onClick={() => addItem(board.groups[0].id, `New ${board.itemLabel.toLowerCase()}`).then((it) => it && setOpen(it._id))} className="btn btn-primary btn-sm"><Plus className="size-3.5" /> New {board.itemLabel.toLowerCase()}</button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
            <input className="input !w-48 !py-1.5 !pl-8" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {personCol && (
            <div className="flex items-center gap-1">
              {members.slice(0, 6).map((m) => (
                <button key={m.id} onClick={() => setPerson(person === m.id ? "" : m.id)} className={clsx("rounded-full", person === m.id && "ring-2 ring-brand ring-offset-2 ring-offset-bg")} title={`Show ${m.name}'s items`}>
                  <Avatar name={m.name} image={m.image} size={26} />
                </button>
              ))}
            </div>
          )}
          <ViewToolbar view={view} columns={board.columns} members={members} onChange={updateView} />
          <button onClick={() => setColsOpen(true)} className="btn btn-ghost btn-sm"><Columns3 className="size-3.5" /> Columns</button>
          <span className="ml-auto text-xs text-faint">{filtered.length} of {items.length}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 px-4 md:px-6">
        {view.type === "table" && (
          <TableView board={board} items={filtered} members={members} hidden={view.hidden} selected={selected}
            onSelect={(ids, on) => setSelected((s) => { const n = new Set(s); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; })}
            onPatchItem={patchItem} onAddItem={addItem} onOpen={setOpen} onDelete={deleteItem} onSaveBoard={saveBoard} onAddColumn={() => setColsOpen(true)} onEditColumns={() => setColsOpen(true)} />
        )}
        {view.type === "kanban" && (
          <KanbanView board={{ ...board, kanbanColumn: view.kanbanColumn || board.kanbanColumn }} items={filtered} members={members} onPatchItem={patchItem} onAddItem={addItem} onOpen={setOpen}
            onSaveBoard={(p) => (p.kanbanColumn ? updateView({ kanbanColumn: p.kanbanColumn }) : saveBoard(p))} />
        )}
        {view.type === "calendar" && (
          <CalendarView board={board} items={filtered} dateColumn={dateCol} onOpen={setOpen} onPickDateColumn={(id) => updateView({ dateColumn: id })}
            onSetDate={(id, date) => patchItem(id, { values: { [dateCol]: date } })}
            onAdd={(date) => addItem(board.groups[0].id, `New ${board.itemLabel.toLowerCase()}`, { [dateCol]: date }).then((it) => it && setOpen(it._id))} />
        )}
      </div>

      <ColumnsModal open={colsOpen} onClose={() => setColsOpen(false)} board={board} boards={boards} onSave={(columns: Column[]) => saveBoard({ columns })} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} board={board} onDone={refresh} />
      <Modal open={newView} onClose={() => setNewView(false)} title="Add a view">
        <div className="grid gap-2 sm:grid-cols-3">
          {([["table", "Table", "Grid with groups, inline editing"], ["kanban", "Kanban", "Cards by status, drag & drop"], ["calendar", "Calendar", "Items on a month calendar by date"]] as const).map(([t, l, d]) => {
            const I = VIEW_ICON[t];
            return <button key={t} onClick={() => addView(t)} className="rounded-lg border border-border p-4 text-left hover:border-brand hover:bg-brand-soft/40"><I className="size-5 text-brand" /><p className="mt-2 font-semibold">{l}</p><p className="text-xs text-muted">{d}</p></button>;
          })}
        </div>
        <p className="mt-3 text-xs text-muted">Each view keeps its own filters, sort and hidden columns. Double-click a view tab to rename it.</p>
      </Modal>
      <Modal open={!!bulkSet} onClose={() => setBulkSet(null)} title={`Set “${bulkSet?.title}” for ${selected.size} items`}>
        {bulkSet && <BulkSetter col={bulkSet} members={members} onApply={(v) => { bulk({ action: "set", column: bulkSet.id, value: v }, "Updated"); setBulkSet(null); }} />}
      </Modal>
      {openItem && (
        <ItemDrawer board={board} item={openItem} members={members} panelApps={panelApps} user={user} workspace={workspace}
          onClose={() => setOpen(null)} onPatch={(p) => patchItem(openItem._id, p)} onDelete={() => deleteItem(openItem._id)} />
      )}
    </div>
  );
}

function BulkSetter({ col, members, onApply }: { col: Column; members: Member[]; onApply: (v: unknown) => void }) {
  const [item, setItem] = useState<ItemT>({ _id: "bulk", name: "", group: "", values: {}, position: 0, createdAt: "", updatedAt: "" });
  return (
    <div className="space-y-4">
      <div className="relative h-10 rounded border border-border">
        <Cell col={col} item={item} members={members} compact onChange={(v) => setItem({ ...item, values: { [col.id]: v } })} />
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={() => onApply(null)}>Clear value</button>
        <button className="btn btn-primary" onClick={() => onApply(item.values[col.id] ?? null)}>Apply to all</button>
      </div>
    </div>
  );
}
