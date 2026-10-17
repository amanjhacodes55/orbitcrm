import Link from "next/link";
import { Types } from "mongoose";
import { CalendarClock, CheckSquare } from "lucide-react";
import { requireCtx } from "@/lib/context";
import { Activity, Board, Item } from "@/lib/models";
import { plain } from "@/lib/serialize";
import TaskList from "@/components/TaskList";

export const dynamic = "force-dynamic";
export const metadata = { title: "My work" };

export default async function MyWork() {
  const ctx = await requireCtx();
  const ws = new Types.ObjectId(ctx.workspace.id);
  const tasks = await Activity.find({ workspace: ws, type: "task", assignee: ctx.user.id, done: false }).sort({ due: 1, createdAt: 1 }).populate("item", "name board").lean();
  const boards = await Board.find({ workspace: ws }).select("name icon columns").lean();
  // Items where I'm in a person column, with their earliest date
  const mine: { id: string; board: string; boardName: string; icon: string; name: string; date: string }[] = [];
  for (const b of boards) {
    const persons = b.columns.filter((c) => c.type === "person").map((c) => c.id);
    if (!persons.length) continue;
    const date = b.columns.find((c) => c.type === "date");
    const items = await Item.find({ board: b._id, $or: persons.map((p) => ({ [`values.${p}`]: ctx.user.id })) }).select("name values").limit(200).lean();
    for (const i of items) mine.push({ id: String(i._id), board: String(b._id), boardName: b.name, icon: b.icon, name: i.name, date: date ? String((i.values as Record<string, unknown>)[date.id] || "") : "" });
  }
  mine.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><CheckSquare className="size-6 text-brand" /> My work</h1>
      <div className="card p-5">
        <h2 className="mb-3 font-semibold">My open tasks ({tasks.length})</h2>
        <TaskList tasks={plain(tasks) as never} />
      </div>
      <div className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><CalendarClock className="size-4 text-warn" /> Items assigned to me ({mine.length})</h2>
        {mine.length === 0 && <p className="text-sm text-muted">Nothing assigned to you.</p>}
        <div className="divide-y divide-border">
          {mine.map((m) => (
            <Link key={m.id} href={`/app/boards/${m.board}?item=${m.id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-surface-2">
              <span>{m.icon}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
              <span className="text-xs text-muted">{m.boardName}</span>
              {m.date && <span className={`w-24 text-right text-xs ${m.date < today ? "text-danger" : m.date === today ? "text-warn" : "text-muted"}`}>{m.date === today ? "today" : m.date}</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
