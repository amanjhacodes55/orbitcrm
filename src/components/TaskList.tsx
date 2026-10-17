"use client";
import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";

type Task = { _id: string; text: string; due?: string; done: boolean; item?: { _id: string; name: string; board: string } | null };

export default function TaskList({ tasks: initial }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initial);
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const bucket = (t: Task) => (!t.due ? "No date" : t.due.slice(0, 10) < today ? "Overdue" : t.due.slice(0, 10) === today ? "Today" : "Upcoming");
  const groups = ["Overdue", "Today", "Upcoming", "No date"];
  async function toggle(t: Task) {
    setTasks((xs) => xs.filter((x) => x._id !== t._id));
    const r = await api(`/api/activities/${t._id}`, { method: "PATCH", json: { done: true } });
    if (!r.ok) { toast(r.error, "error"); setTasks((xs) => [...xs, t]); }
    else toast("Task completed ✓", "success");
  }
  if (!tasks.length) return <p className="text-sm text-muted">No open tasks. 🎉 Add tasks from any item&apos;s Tasks tab.</p>;
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const list = tasks.filter((t) => bucket(t) === g);
        if (!list.length) return null;
        return (
          <div key={g}>
            <p className={clsx("mb-1 text-xs font-bold uppercase tracking-wide", g === "Overdue" ? "text-danger" : g === "Today" ? "text-warn" : "text-muted")}>{g} · {list.length}</p>
            {list.map((t) => (
              <div key={t._id} className="flex items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-surface-2">
                <input type="checkbox" className="size-4 accent-[var(--brand)]" onChange={() => toggle(t)} aria-label="Complete task" />
                <span className="min-w-0 flex-1 truncate">{t.text}</span>
                {t.item && <Link href={`/app/boards/${t.item.board}?item=${t.item._id}`} className="truncate text-xs text-brand hover:underline">{t.item.name}</Link>}
                {t.due && <span className="w-20 text-right text-xs text-muted">{t.due.slice(0, 10)}</span>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
