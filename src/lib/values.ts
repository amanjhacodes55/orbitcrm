/** Column value helpers shared by server and client. */
export type Opt = { id: string; label: string; color: string };
export type Col = { id: string; title: string; type: string; width?: number; options?: Opt[] };

export function displayValue(col: Col, v: unknown, users?: Record<string, string>): string {
  if (v === null || v === undefined || v === "") return "";
  switch (col.type) {
    case "status":
    case "dropdown":
      return col.options?.find((o) => o.id === v)?.label ?? "";
    case "person":
      return users?.[String(v)] ?? String(v);
    case "checkbox":
      return v ? "Yes" : "No";
    case "currency":
      return typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : String(v);
    default:
      return String(v);
  }
}

/** Convert loose input (from API, automations, imports) into the stored representation. */
export function coerceValue(col: Col, raw: unknown): unknown {
  if (raw === null || raw === undefined) return null;
  const s = typeof raw === "string" ? raw.trim() : raw;
  if (s === "") return null;
  switch (col.type) {
    case "status":
    case "dropdown": {
      const str = String(s);
      const o = col.options?.find((x) => x.id === str || x.label.toLowerCase() === str.toLowerCase());
      return o ? o.id : null;
    }
    case "number":
    case "currency": {
      const n = typeof s === "number" ? s : Number(String(s).replace(/[,₹$\s]/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    case "rating": {
      const n = Math.round(Number(s));
      return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : null;
    }
    case "checkbox":
      return s === true || ["true", "yes", "1", "on"].includes(String(s).toLowerCase());
    case "date": {
      const d = new Date(String(s));
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
    default:
      return String(s).slice(0, 2000);
  }
}

export function findColumn(cols: Col[], key: string): Col | undefined {
  const k = key.toLowerCase();
  return cols.find((c) => c.id === key) || cols.find((c) => c.title.toLowerCase() === k);
}
