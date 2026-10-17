import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { v1, apiErr } from "@/lib/publicApi";
import { Activity, Board, Item } from "@/lib/models";
import { emit } from "@/lib/events";

/** Log a call / note / email on an item. Used by dialer apps after a call ends. */
export const POST = v1<{ id: string }>("activities.write", async (req, ctx, { id }) => {
  const it = isValidObjectId(id) ? await Item.findOne({ _id: id, workspace: ctx.workspace }).lean() : null;
  if (!it) return apiErr("Item not found", 404);
  const p = z
    .object({
      type: z.enum(["call", "note", "email"]),
      text: z.string().max(5000).default(""),
      data: z.object({ direction: z.enum(["outbound", "inbound"]).optional(), outcome: z.string().max(40).optional(), durationSec: z.number().min(0).optional(), phone: z.string().max(40).optional(), recordingUrl: z.string().max(500).optional() }).partial().default({}),
    })
    .safeParse(await req.json());
  if (!p.success) return apiErr("Invalid activity");
  const act = await Activity.create({ workspace: it.workspace, board: it.board, item: it._id, type: p.data.type, actorLabel: ctx.label, text: p.data.text, data: p.data.data });
  const b = await Board.findById(it.board).lean();
  await emit("activity.created", { workspace: ctx.workspace, board: b as never, item: it as never, changes: [], actor: { label: ctx.label, source: "api" }, activity: { id: String(act._id), type: act.type, text: act.text, data: act.data } });
  return NextResponse.json({ activity: { id: String(act._id), type: act.type } }, { status: 201 });
});
