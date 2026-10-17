import { isValidObjectId } from "mongoose";
import { route, err, json } from "@/lib/api";
import { Automation, Board, Item } from "@/lib/models";
import { runAutomation } from "@/lib/automation";

/** Run an automation now against a chosen item (or a sample payload for catch hooks). */
export const POST = route<{ id: string }>(async (req, ctx, { id }) => {
  if (!isValidObjectId(id)) return err("Not found", 404);
  const a = await Automation.findOne({ _id: id, workspace: ctx.workspace.id }).lean();
  if (!a) return err("Not found", 404);
  const body = await req.json().catch(() => ({}));
  const board = await Board.findById(a.board).lean();
  const item = body.item && isValidObjectId(body.item) ? await Item.findOne({ _id: body.item, board: a.board }).lean() : null;
  const r = await runAutomation(a as never, { board: board as never, item: item as never, payload: body.payload ?? {}, depth: 0 });
  return json({ status: r.status, steps: r.steps });
});
