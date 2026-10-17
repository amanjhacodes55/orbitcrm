/** Board filtering / sorting shared by the UI views (client) and the server. */
import { displayValue, type Col } from "@/lib/values";

export type Filter = { column: string; op: string; value?: unknown };
export type ViewT = {
  id: string; name: string; type: "table" | "kanban" | "calendar";
  filters: Filter[]; match: "all" | "any"; sort: { column: string; dir: "asc" | "desc" };
  hidden: string[]; kanbanColumn: string; dateColumn: string;
};
type ItemLike = { _id: string; name: string; group: string; values: Record<string, unknown>; createdAt?: string; updatedAt?: string };

export const OPS_BY_TYPE: Record<string, [string, string][]> = {
  text: [["contains", "contains"], ["not_contains", "doesn't contain"], ["equals", "is"], ["is_empty", "is empty"], ["not_empty", "is not empty"]],
  status: [["in", "is any of"], ["not_in", "is none of"], ["is_empty", "is empty"], ["not_empty", "is not empty"]],
  person: [["in", "is any of"], ["me", "is me"], ["is_empty", "is unassigned"], ["not_empty", "is assigned"]],
  date: [["today", "is today"], ["overdue", "is overdue"], ["this_week", "is in the next 7 days"], ["before", "is before"], ["after", "is after"], ["is_empty", "is empty"], ["not_empty", "is not empty"]],
  number: [["gt", ">"], ["gte", "≥"], ["lt", "<"], ["lte", "≤"], ["equals", "="], ["is_empty", "is empty"], ["not_empty", "is not empty"]],
  checkbox: [["checked", "is checked"], ["unchecked", "is unchecked"]],
  relation: [["not_empty", "has links"], ["is_empty", "has no links"]],
};
export function opsFor(type: string) {
  if (type === "dropdown") return OPS_BY_TYPE.status;
  if (type === "currency" || type === "rating") return OPS_BY_TYPE.number;
  if (["email", "phone", "link"].includes(type)) return OPS_BY_TYPE.text;
  return OPS_BY_TYPE[type] || OPS_BY_TYPE.text;
}

const today = () => new Date().toISOString().slice(0, 10);

export function matchFilter(f: Filter, it: ItemLike, cols: Col[], me?: string): boolean {
  const col = f.column === "name" ? { id: "name", title: "Name", type: "text" } as Col : f.column === "group" ? null : cols.find((c) => c.id === f.column);
  const raw = f.column === "name" ? it.name : f.column === "group" ? it.group : it.values?.[f.column];
  const empty = raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0);
  const val = f.value;
  switch (f.op) {
    case "is_empty": return empty;
    case "not_empty": return !empty;
    case "in": return Array.isArray(val) ? val.includes(raw as string) : raw === val;
    case "not_in": return Array.isArray(val) ? !val.includes(raw as string) : raw !== val;
    case "me": return !!me && raw === me;
    case "checked": return !!raw;
    case "unchecked": return !raw;
    case "today": return raw === today();
    case "overdue": return !empty && String(raw) < today();
    case "this_week": { const t = today(); const w = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10); return !empty && String(raw) >= t && String(raw) <= w; }
    case "before": return !empty && String(raw) < String(val);
    case "after": return !empty && String(raw) > String(val);
    case "gt": return !empty && Number(raw) > Number(val);
    case "gte": return !empty && Number(raw) >= Number(val);
    case "lt": return !empty && Number(raw) < Number(val);
    case "lte": return !empty && Number(raw) <= Number(val);
    case "equals": {
      if (col?.type === "number" || col?.type === "currency" || col?.type === "rating") return Number(raw) === Number(val);
      return String(raw ?? "").toLowerCase() === String(val ?? "").toLowerCase();
    }
    case "contains":
    case "not_contains": {
      const shown = col ? displayValue(col, raw) : String(raw ?? "");
      const has = shown.toLowerCase().includes(String(val ?? "").toLowerCase());
      return f.op === "contains" ? has : !has;
    }
    default: return true;
  }
}

export function applyView<T extends ItemLike>(items: T[], view: Pick<ViewT, "filters" | "match" | "sort"> | null, cols: Col[], me?: string, users?: Record<string, string>): T[] {
  if (!view) return items;
  const active = view.filters.filter((f) => f.column && f.op);
  let out = active.length ? items.filter((it) => (view.match === "any" ? active.some((f) => matchFilter(f, it, cols, me)) : active.every((f) => matchFilter(f, it, cols, me)))) : items;
  const s = view.sort;
  if (s?.column) {
    const col = cols.find((c) => c.id === s.column);
    const key = (it: T): string | number => {
      if (s.column === "name") return it.name.toLowerCase();
      if (s.column === "createdAt") return it.createdAt || "";
      if (s.column === "updatedAt") return it.updatedAt || "";
      const v = it.values?.[s.column];
      if (v === null || v === undefined || v === "") return s.dir === "asc" ? "￿" : "";
      if (col && ["number", "currency", "rating"].includes(col.type)) return Number(v);
      if (col && (col.type === "status" || col.type === "dropdown")) return col.options?.findIndex((o) => o.id === v) ?? 0;
      if (col?.type === "person") return (users?.[String(v)] || "").toLowerCase();
      return String(v).toLowerCase();
    };
    out = [...out].sort((a, b) => {
      const ka = key(a), kb = key(b);
      const r = ka < kb ? -1 : ka > kb ? 1 : 0;
      return s.dir === "desc" ? -r : r;
    });
  }
  return out;
}

export function defaultViews(board: { kanbanColumn?: string; columns: Col[] }): ViewT[] {
  const date = board.columns.find((c) => c.type === "date");
  const base = { filters: [], match: "all" as const, sort: { column: "", dir: "asc" as const }, hidden: [], kanbanColumn: board.kanbanColumn || "", dateColumn: date?.id || "" };
  return [
    { id: "main", name: "Main table", type: "table", ...base },
    { id: "kanban", name: "Kanban", type: "kanban", ...base },
    ...(date ? [{ id: "calendar", name: "Calendar", type: "calendar" as const, ...base }] : []),
  ];
}
