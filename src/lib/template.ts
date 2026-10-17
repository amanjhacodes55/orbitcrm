import { displayValue, findColumn, type Col } from "@/lib/values";

export type TplCtx = {
  item?: { _id?: unknown; name: string; values: Record<string, unknown>; group?: string } | null;
  columns?: Col[];
  payload?: unknown;
  outputs?: Record<string, unknown>;
  users?: Record<string, string>;
};

function dig(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[p];
    else return undefined;
  }
  return cur;
}

/** "Hi {{item.name}}, {{item.Email}} {{payload.contact.phone}} {{outputs.score}}" */
export function render(tpl: string, ctx: TplCtx): string {
  return String(tpl ?? "").replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expr: string) => {
    const [root, ...rest] = expr.split(".");
    if (root === "item" && ctx.item) {
      if (rest.length === 0) return ctx.item.name;
      const key = rest.join(".");
      if (key === "name") return ctx.item.name;
      if (key === "id") return String(ctx.item._id ?? "");
      const col = findColumn(ctx.columns || [], key);
      return col ? displayValue(col, ctx.item.values?.[col.id], ctx.users) : "";
    }
    if (root === "payload") {
      const v = dig(ctx.payload, rest);
      return v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    if (root === "outputs") {
      const v = dig(ctx.outputs, rest);
      return v === undefined ? "" : String(v);
    }
    if (root === "now") return new Date().toISOString();
    if (root === "today") return new Date().toISOString().slice(0, 10);
    return "";
  });
}
