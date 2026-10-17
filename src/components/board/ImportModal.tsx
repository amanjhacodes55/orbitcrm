"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import { Modal } from "@/components/ui";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import type { BoardT } from "./types";

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, newlines in quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export default function ImportModal({ open, onClose, board, onDone }: { open: boolean; onClose: () => void; board: BoardT; onDone: () => void }) {
  const toast = useToast();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [group, setGroup] = useState(board.groups[0]?.id || "");
  const [busy, setBusy] = useState(false);

  function load(file: File) {
    const r = new FileReader();
    r.onload = () => {
      const data = parseCsv(String(r.result || ""));
      if (data.length < 2) return toast("The CSV needs a header row and at least one data row", "error");
      const h = data[0].map((x) => x.trim());
      setHeaders(h);
      setRows(data.slice(1).map((cells) => Object.fromEntries(h.map((k, i) => [k, cells[i] ?? ""]))));
      // auto-map by title
      const m: Record<string, string> = {};
      h.forEach((k, i) => {
        const col = board.columns.find((c) => c.title.toLowerCase() === k.toLowerCase());
        if (col) m[k] = col.id;
        else if (["name", "full name", "title", board.itemLabel.toLowerCase()].includes(k.toLowerCase()) || (i === 0 && !Object.values(m).includes("name"))) m[k] = "name";
      });
      setMapping(m);
    };
    r.readAsText(file);
  }
  async function run() {
    setBusy(true);
    const r = await api<{ imported: number; skipped: number }>(`/api/boards/${board._id}/import`, { method: "POST", json: { rows: rows.slice(0, 5000), mapping, group } });
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    toast(`Imported ${r.data.imported} ${board.itemLabel.toLowerCase()}s${r.data.skipped ? ` (${r.data.skipped} skipped: no name)` : ""}`, "success");
    setHeaders([]); setRows([]);
    onDone();
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} wide title={`Import ${board.itemLabel.toLowerCase()}s from CSV`} footer={headers.length ? <><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !Object.values(mapping).includes("name")} onClick={run}>Import {rows.length} rows</button></> : undefined}>
      {!headers.length ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-10 text-center hover:border-brand">
          <Upload className="size-8 text-brand" />
          <span className="font-semibold">Choose a .csv file</span>
          <span className="text-xs text-muted">First row = headers. Up to 5,000 rows. Columns are matched to your board by name; status values by label.</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm"><span className="text-muted">Import into group</span><select className="input !w-auto !py-1" value={group} onChange={(e) => setGroup(e.target.value)}>{board.groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="py-1">CSV column</th><th>Sample</th><th>→ Board column</th></tr></thead>
            <tbody>
              {headers.map((h) => (
                <tr key={h} className="border-t border-border">
                  <td className="py-1.5 font-medium">{h}</td>
                  <td className="max-w-40 truncate text-muted">{rows[0]?.[h]}</td>
                  <td>
                    <select className="input !py-1" value={mapping[h] || ""} onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}>
                      <option value="">— skip —</option>
                      <option value="name">{board.itemLabel} name</option>
                      {board.columns.filter((c) => c.type !== "relation").map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
