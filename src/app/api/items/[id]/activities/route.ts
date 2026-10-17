import { z } from "zod";
import { route, err, json } from "@/lib/api";
import { itemFor } from "@/lib/access";
import { Activity, Board } from "@/lib/models";
import { emit } from "@/lib/events";
import { plain } from "@/lib/serialize";

type P = { id: string };

export const GET = route<P>(async (_req, ctx, { id }) => {
  const it = await itemFor(ctx, id);
  if (!it) return err("Item not found", 404);
  const acts = await Activity.find({ item: it._id }).sort({ createdAt: -1 }).limit(100).populate("actor", "name image").lean();
  return json({ activities: plain(acts) });
});

const Body = z.object({
  type: z.enum(["note", "call", "email"]),
  text: z.string().max(5000).default(""),
  data: z
    .object({ direction: z.enum(["outbound", "inbound"]).optional(), outcome: z.string().max(40).optional(), durationSec: z.number().min(0).max(86400).optional(), phone: z.string().max(40).optional(), recordingUrl: z.string().max(500).optional() })
    .partial()
    .default({}),
  appLabel: z.string().max(60).optional(), // when an embedded app logs a call through the host bridge
});

export const POST = route<P>(async (req, ctx, { id }) => {
  const it = await itemFor(ctx, id);
  if (!it) return err("Item not found", 404);
  const p = Body.safeParse(await req.json());
  if (!p.success) return err("Invalid activity");
  if (p.data.type === "note" && !p.data.text.trim()) return err("Note is empty");
  const act = await Activity.create({ workspace: it.workspace, board: it.board, item: it._id, type: p.data.type, actor: ctx.user.id, actorLabel: p.data.appLabel || "", text: p.data.text, data: p.data.data });
  const board = await Board.findById(it.board).lean();
  await emit("activity.created", { workspace: String(it.workspace), board: board as never, item: it.toObject() as never, changes: [], actor: { userId: ctx.user.id, source: "web" }, activity: { id: String(act._id), type: act.type, text: act.text, data: act.data } });
  return json({ activity: plain(act.toObject()) });
});
