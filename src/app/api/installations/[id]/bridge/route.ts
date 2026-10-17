import { isValidObjectId } from "mongoose";
import { route, err, json } from "@/lib/api";
import { Activity, App, Board, Installation, Item } from "@/lib/models";
import { updateItem } from "@/lib/items";
import { emit, publicItem } from "@/lib/events";
import { runAppTrigger } from "@/lib/automation";

/**
 * Host bridge for embedded apps (iframes). The CRM page forwards SDK calls here; scopes are enforced server-side
 * against the installation, and everything is limited to the signed-in user's workspace.
 */
const NEED: Record<string, string | null> = {
  getItem: "items.read",
  updateItem: "items.write",
  logActivity: "activities.write",
  fireTrigger: "triggers.fire",
  getSettings: null,
  saveSettings: null,
};

export const POST = route<{ id: string }>(async (req, ctx, { id }) => {
  if (!isValidObjectId(id)) return err("Not found", 404);
  const inst = await Installation.findOne({ _id: id, workspace: ctx.workspace.id, active: true });
  if (!inst) return err("App is not installed in this workspace", 404);
  const app = await App.findById(inst.app).select("name slug triggers").lean();
  const { method, params = {} } = await req.json();
  if (!(method in NEED)) return err(`Unknown method ${method}`);
  const scope = NEED[method];
  if (scope && !inst.scopes.includes(scope)) return err(`${app?.name} doesn't have the “${scope}” permission`, 403);
  const label = app?.name || "App";
  const item = params.id || params.item_id ? await Item.findOne({ _id: params.id || params.item_id, workspace: ctx.workspace.id }).catch(() => null) : null;

  switch (method) {
    case "getSettings":
      return json({ result: inst.settings || {} });
    case "saveSettings":
      if (ctx.workspace.role === "member") return err("Only workspace admins can change app settings", 403);
      if (typeof params !== "object" || JSON.stringify(params).length > 20000) return err("Settings too large");
      inst.settings = params;
      inst.markModified("settings");
      await inst.save();
      return json({ result: { ok: true } });
    case "getItem": {
      if (!item) return err("Item not found", 404);
      const board = await Board.findById(item.board).lean();
      return json({ result: publicItem(board as never, item.toObject() as never) });
    }
    case "updateItem": {
      if (!item) return err("Item not found", 404);
      const { item: upd } = await updateItem(String(item._id), { values: params.values || {} }, { userId: ctx.user.id, label, source: `app:${app?.slug}` });
      const board = await Board.findById(item.board).lean();
      return json({ result: publicItem(board as never, upd.toObject() as never) });
    }
    case "logActivity": {
      if (!item) return err("Item not found", 404);
      const type = ["call", "note", "email"].includes(params.type) ? params.type : "note";
      const data = { direction: params.direction, outcome: params.outcome ? String(params.outcome).slice(0, 40) : undefined, durationSec: Number(params.durationSec) || 0, phone: params.phone ? String(params.phone).slice(0, 40) : undefined };
      const act = await Activity.create({ workspace: ctx.workspace.id, board: item.board, item: item._id, type, actor: ctx.user.id, actorLabel: label, text: String(params.text || "").slice(0, 5000), data });
      const board = await Board.findById(item.board).lean();
      await emit("activity.created", { workspace: ctx.workspace.id, board: board as never, item: item.toObject() as never, changes: [], actor: { userId: ctx.user.id, label, source: `app:${app?.slug}` }, activity: { id: String(act._id), type, text: act.text, data } });
      return json({ result: { id: String(act._id) } });
    }
    case "fireTrigger": {
      if (!app?.triggers.some((t) => t.key === params.key)) return err(`Trigger “${params.key}” is not declared by ${label}`);
      const results = await runAppTrigger(ctx.workspace.id, String(inst.app), params.key, { item_id: params.item_id, data: params.data || {} });
      return json({ result: { triggered: results.length, results } });
    }
  }
  return err("Unsupported");
});
