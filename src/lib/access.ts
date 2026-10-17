import "server-only";
import { isValidObjectId } from "mongoose";
import { Board, Item, Workspace } from "@/lib/models";
import type { Ctx } from "@/lib/context";

export async function boardFor(ctx: Ctx, id: string) {
  if (!isValidObjectId(id)) return null;
  return Board.findOne({ _id: id, workspace: ctx.workspace.id });
}
export async function itemFor(ctx: Ctx, id: string) {
  if (!isValidObjectId(id)) return null;
  return Item.findOne({ _id: id, workspace: ctx.workspace.id });
}
export async function memberMap(workspaceId: string) {
  const ws = await Workspace.findById(workspaceId).populate("members.user", "name email image").lean();
  const users = (ws?.members || []).map((m) => {
    const u = m.user as unknown as { _id: unknown; name: string; email: string; image?: string };
    return { id: String(u._id), name: u.name, email: u.email, image: u.image || "", role: m.role };
  });
  return users;
}
