"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Columns3, Kanban, Plus, Search, Settings2, Table2, Trash2, Workflow, Download } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { Avatar } from "@/components/ui";
import TableView from "./TableView";
import KanbanView from "./KanbanView";
import ItemDrawer from "./ItemDrawer";
import ColumnsModal from "./ColumnsModal";
import { displayValue } from "@/lib/values";
import type { BoardT, Column, ItemT, Member, PanelApp } from "./types";

export default function BoardView({ initialBoard, initialItems, members, panelApps, user, workspace, canAdmin }: {
  initialBoard: BoardT; initialItems: ItemT[]; members: Member[]; panelApps: PanelApp[]; user: Record<string, unknown>; workspace: Record<string, unknown>; canAdmin: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [board, setBoard] = useState(initialBoard);
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [q, setQ] = useState("");
  const [person, setPerson] = useState("");
  const [colsOpen, setColsOpen] = useState(false);
  const openId = sp.get("item");

  useEffect(() => {
    setBoard(initialBoard);
    setItems(initialItems);
  }, [initialBoard, initialItems]);
  useEffect(() => {
    try {
      const v = localStorage.getItem(`orbit-view:${initialBoard._id}`);
      if (v === "kanban" || v === "table") setView(v);
      else if (initialBoard.kind === "deals") setView("kanban");
    } catch {}
  }, [initialBoard._id, initialBoard.kind]);
  const changeView = (v: "table" | "kanban") => {
    setView(v);
    try {
      localStorage.setItem(`orbit-view:${board._id}`, v);
    } catch {}
  };

  const setOpen = (id: string | null) => {
    const u = new URLSearchParams(sp.toString());
    if (id) u.set("item", id);
    else u.delete("item");
    router.replace(`${path}${u.size ? "?" + u : ""}`, { scroll: false });
  };

  // refresh items when returning to the tab (automations / apps may have changed things)
  const refresh = useCallback(async () => {
    const r = await api<{ board: BoardT; items: ItemT[] }>(`/api/boards/${board._id}`);
    if (r.ok) {
      setBoard(r.data.board);
      setItems(r.data.items);
    }
  }, [board._id]);
  useEffect(() => {
    const f = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [refresh]);

  const patchItem = async (id: string, patch: { name?: string; group?: string; values?: Record<string, unknown> }) => {
    const prev = items;
    setItems((xs) => xs.map((x) => (x._id === id ? { ...x, ...patch, values: { ...x.values, ...(patch.values || {}) } } : x)));
    const r = await api<{ item: ItemT }>(`/api/items/${id}`, { method: "PATCH", json: patch });
    if (!r.ok) {
      setItems(prev);
      return toast(r.error, "error");
    }
    // automations may have changed other fields / created items → resync shortly
    setItems((xs) => xs.map((x) => (x._id === id ? r.data.item : x)));
    if (patch.values) setTimeout(refresh, 400);
  };
  const addItem = async (group: string, name: string, values?: Record<string, unknown>) => {
    const r = await api<{ item: ItemT }>(`/api/boards/${board._id}/items`, { method: "POST", json: { name, group, values } });
    if (!r.ok) return toast(r.error, "error");
    setItems((xs) => [r.data.item, ...xs]);
    setTimeout(refresh, 600);
  };
  const deleteItem = async (id: string) => {
    const prev = items;
    setItems((xs) => xs.filter((x) => x._id !== id));
    if (openId === id) setOpen(null);
    const r = await api(`/api/items/${id}`, { method: "DELETE" });
    if (!r.ok) {
      setItems(prev);
      toast(r.error, "error");
    }
  };
  const saveBoard = async (patch: Partial<BoardT>) => {
    const prev = board;
    setBoard({ ...board, ...patch });
    const r = await api<{ board: BoardT }>(`/api/boards/${board._id}`, { method: "PATCH", json: patch });
    if (!r.ok) {
      setBoard(prev);
      return toast(r.error, "error");
    }
    setBoard(r.data.board);
    if (patch.name || patch.icon) router.refresh();
  };
  const deleteBoard = async () => {
    if (!confirm(`Delete the board “${board.name}” and all its ${items.length} items, automations and activity? This can't be undone.`)) return;
    const r = await api(`/api/boards/${board._id}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, "error");
    router.push("/app");
    router.refresh();
  };
  const exportCsv = () => {
    const cols = board.columns;
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = [["Name", "Group", ...cols.map((c) => c.title)].map(esc).join(",")];
    for (const it of filtered) rows.push([it.name, board.groups.find((g) => g.id === it.group)?.title || "", ...cols.map((c) => (c.type === "person" ? members.find((m) => m.id === it.values[c.id])?.name || "" : displayValue(c, it.values[c.id])))].map((x) => esc(String(x))).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    a.download = `${board.name}.csv`;
    a.click();
  };

  const personCol = board.columns.find((c) => c.type === "person");
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return items.filter((it) => {
      if (person && personCol && it.values[personCol.id] !== person) return false;
      if (!s) return true;
      if (it.name.toLowerCase().includes(s)) return true;
      return board.columns.some((c) => displayValue(c, it.values[c.id]).toLowerCase().includes(s));
    });
  }, [items, q, person, personCol, board.columns]);
  const openItem = items.find((i) => i._id === openId);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-surface px-4 pt-4 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <input
            defaultValue={board.icon}
            key={`i${board.icon}`}
            maxLength={4}
            onBlur={(e) => e.target.value && e.target.value !== board.icon && saveBoard({ icon: e.target.value })}
            className="w-10 rounded bg-transparent text-center text-2xl outline-none focus:ring-2 focus:ring-brand/40"
            aria-label="Board icon"
          />
          <input
            defaultValue={board.name}
            key={`n${board.name}`}
            onBlur={(e) => e.target.value.trim() && e.target.value !== board.name && saveBoard({ name: e.target.value.trim() })}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="min-w-0 flex-1 rounded bg-transparent text-2xl font-bold outline-none focus:ring-2 focus:ring-brand/40"
            aria-label="Board name"
          />
          <Link href={`/app/automations?board=${board._id}`} className="btn btn-secondary btn-sm">
            <Workflow className="size-3.5" /> Automate
          </Link>
          <button onClick={exportCsv} className="btn btn-ghost btn-sm" title="Export CSV">
            <Download className="size-3.5" />
          </button>
          {canAdmin && (
            <button onClick={deleteBoard} className="btn btn-ghost btn-sm hover:!text-danger" title="Delete board" aria-label="Delete board">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
        <p className="mt-0.5 pl-12 text-sm text-muted">{board.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(
            [
              ["table", "Main table", Table2],
              ["kanban", "Kanban", Kanban],
            ] as const
          ).map(([v, l, I]) => (
            <button key={v} onClick={() => changeView(v)} className={clsx("relative flex items-center gap-1.5 px-3 py-2 text-sm", view === v ? "font-semibold text-text" : "text-muted hover:text-text")}>
              <I className="size-4" /> {l}
              {view === v && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-6">
        <button onClick={() => addItem(board.groups[0].id, `New ${board.itemLabel.toLowerCase()}`)} className="btn btn-primary btn-sm">
          <Plus className="size-3.5" /> New {board.itemLabel.toLowerCase()}
        </button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <input className="input !w-56 !py-1.5 !pl-8" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {personCol && (
          <div className="flex items-center gap-1">
            {members.slice(0, 6).map((m) => (
              <button key={m.id} onClick={() => setPerson(person === m.id ? "" : m.id)} className={clsx("rounded-full", person === m.id && "ring-2 ring-brand ring-offset-2 ring-offset-bg")} title={`Filter: ${m.name}`}>
                <Avatar name={m.name} image={m.image} size={26} />
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setColsOpen(true)} className="btn btn-ghost btn-sm">
          <Columns3 className="size-3.5" /> Columns
        </button>
        <span className="ml-auto text-xs text-faint">
          <Settings2 className="mr-1 inline size-3.5" />
          {filtered.length} of {items.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 px-4 md:px-6">
        {view === "table" ? (
          <TableView board={board} items={filtered} members={members} onPatchItem={patchItem} onAddItem={addItem} onOpen={setOpen} onDelete={deleteItem} onSaveBoard={saveBoard} onAddColumn={() => setColsOpen(true)} onEditColumns={() => setColsOpen(true)} />
        ) : (
          <KanbanView board={board} items={filtered} members={members} onPatchItem={patchItem} onAddItem={addItem} onOpen={setOpen} onSaveBoard={saveBoard} />
        )}
      </div>
      <ColumnsModal open={colsOpen} onClose={() => setColsOpen(false)} board={board} onSave={(columns: Column[]) => saveBoard({ columns })} />
      {openItem && (
        <ItemDrawer
          board={board}
          item={openItem}
          members={members}
          panelApps={panelApps}
          user={user}
          workspace={workspace}
          onClose={() => setOpen(null)}
          onPatch={(p) => patchItem(openItem._id, p)}
          onDelete={() => deleteItem(openItem._id)}
        />
      )}
    </div>
  );
}
