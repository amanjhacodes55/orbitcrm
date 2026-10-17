import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isValidObjectId } from "mongoose";
import { requireCtx } from "@/lib/context";
import { App, Board, Installation, Item } from "@/lib/models";
import { memberMap } from "@/lib/access";
import { plain } from "@/lib/serialize";
import BoardView from "@/components/board/BoardView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = isValidObjectId(id) ? await Board.findById(id).select("name").lean() : null;
  return { title: b?.name || "Board" };
}

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  if (!isValidObjectId(id)) notFound();
  const board = await Board.findOne({ _id: id, workspace: ctx.workspace.id }).lean();
  if (!board) notFound();
  const [items, members, installs, boards] = await Promise.all([
    Item.find({ board: board._id }).sort({ position: 1, createdAt: 1 }).lean(),
    memberMap(ctx.workspace.id),
    Installation.find({ workspace: ctx.workspace.id, active: true }).select("app").lean(),
    Board.find({ workspace: ctx.workspace.id }).select("name icon").lean(),
  ]);
  const apps = await App.find({ _id: { $in: installs.map((i) => i.app) }, "features.itemPanelUrl": { $ne: "" } }).select("name icon features").lean();
  const panelApps = apps.map((a) => ({ installationId: String(installs.find((i) => String(i.app) === String(a._id))!._id), name: a.name, icon: a.icon, url: a.features!.itemPanelUrl! }));
  return (
    <Suspense>
      <BoardView
        initialBoard={plain(board) as never}
        initialItems={plain(items) as never}
        members={members}
        panelApps={panelApps}
        user={ctx.user}
        workspace={ctx.workspace}
        canAdmin={ctx.workspace.role !== "member"}
        boards={boards.map((b) => ({ id: String(b._id), name: b.name, icon: b.icon }))}
      />
    </Suspense>
  );
}
