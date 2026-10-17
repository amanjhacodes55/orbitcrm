import "server-only";
import { Activity, App, Automation, AutomationRun, Board, Installation, Item, Notification, Workspace } from "@/lib/models";
import { createItem, updateItem, type Actor } from "@/lib/items";
import { publicItem, sign, type EventData, type EventName } from "@/lib/events";
import { render, type TplCtx } from "@/lib/template";
import { coerceValue, displayValue, type Col } from "@/lib/values";
import { outboundFetch } from "@/lib/outbound";

export const TRIGGERS = {
  item_created: "When an item is created",
  column_changed: "When a column changes",
  catch_hook: "When a webhook is received (catch hook)",
  app_trigger: "When an app fires a trigger",
  message_received: "When a message arrives in the Inbox",
} as const;

export const ACTIONS = {
  set_column: "Set a column value",
  move_to_group: "Move item to group",
  create_item: "Create an item",
  add_note: "Add a note to the item",
  notify: "Notify someone",
  send_webhook: "Send a webhook (HTTP request)",
  app_action: "Run an app action",
  reply_message: "Reply to the conversation",
} as const;

const MAX_DEPTH = 3;

type AutoDoc = {
  _id: unknown;
  workspace: unknown;
  board: unknown;
  name: string;
  trigger: { type: string; config: Record<string, unknown> };
  conditions: { column?: string | null; op?: string | null; value?: unknown }[];
  actions: { type?: string | null; config: Record<string, unknown> }[];
};
type BoardDoc = { _id: unknown; workspace: unknown; name: string; columns: Col[]; groups: { id: string; title?: string | null }[] };
type ItemDoc = { _id: unknown; name: string; values: Record<string, unknown>; group: string } | null;

export async function runAutomationsForEvent(event: EventName, data: EventData) {
  if (!data.board || !data.item) return;
  const depth = data.actor.depth ?? 0;
  if (depth >= MAX_DEPTH) return;
  const types = event === "item.created" ? ["item_created"] : event === "item.updated" ? ["column_changed"] : [];
  if (!types.length) return;
  const autos = await Automation.find({ board: data.board._id, enabled: true, "trigger.type": { $in: types } }).lean();
  for (const a of autos) {
    const trig = a.trigger as { type: string; config?: Record<string, unknown> };
    const cfg = (trig.config || {}) as Record<string, unknown>;
    if (trig.type === "item_created" && cfg.group && cfg.group !== data.item.group) continue;
    if (trig.type === "column_changed") {
      const ch = data.changes.find((c) => c.column === cfg.column);
      if (!ch) continue;
      if (cfg.to !== undefined && cfg.to !== null && cfg.to !== "" && ch.to !== cfg.to) continue;
    }
    await runAutomation(a as unknown as AutoDoc, { board: data.board as unknown as BoardDoc, item: data.item, payload: { event, changes: data.changes }, depth });
  }
}

function checkConditions(conds: AutoDoc["conditions"], board: BoardDoc, item: ItemDoc): boolean {
  if (!item) return conds.length === 0;
  return conds.every((c) => {
    if (!c.column) return true;
    const col = board.columns.find((x) => x.id === c.column);
    const raw = c.column === "name" ? item.name : item.values?.[c.column];
    const shown = col ? displayValue(col, raw) : String(raw ?? "");
    const target = String(c.value ?? "");
    const tLabel = col && (col.type === "status" || col.type === "dropdown") ? col.options?.find((o) => o.id === target)?.label ?? target : target;
    switch (c.op) {
      case "equals":
        return raw === c.value || shown.toLowerCase() === tLabel.toLowerCase();
      case "not_equals":
        return !(raw === c.value || shown.toLowerCase() === tLabel.toLowerCase());
      case "contains":
        return shown.toLowerCase().includes(tLabel.toLowerCase());
      case "is_empty":
        return !shown;
      case "not_empty":
        return !!shown;
      case "gt":
        return Number(raw) > Number(c.value);
      case "lt":
        return Number(raw) < Number(c.value);
      default:
        return true;
    }
  });
}

export async function runAutomation(a: AutoDoc, input: { board: BoardDoc; item: ItemDoc; payload?: unknown; depth: number }) {
  const t0 = Date.now();
  const steps: { action: string; ok: boolean; detail: string }[] = [];
  let item = input.item;
  let board = input.board;
  const outputs: Record<string, unknown> = {};
  const actor: Actor = { label: `Automation: ${a.name}`, source: "automation", depth: input.depth + 1 };
  const ctx = (): TplCtx => ({ item, columns: board.columns, payload: input.payload, outputs });

  if (!checkConditions(a.conditions, board, item)) {
    await AutomationRun.create({ workspace: a.workspace, automation: a._id, status: "skipped", trigger: a.trigger.type, item: item?._id, steps: [{ action: "conditions", ok: true, detail: "Conditions not met" }], durationMs: Date.now() - t0 });
    return { status: "skipped" as const, steps, item };
  }

  let failed = false;
  for (const act of a.actions) {
    const cfg = act.config || {};
    const type = act.type || "";
    try {
      if (type === "create_item") {
        const target = String(cfg.board || "") && String(cfg.board) !== String(board._id) ? await Board.findOne({ _id: cfg.board, workspace: a.workspace }).lean() : board;
        if (!target) throw new Error("Target board not found");
        const values: Record<string, unknown> = {};
        for (const [cid, tpl] of Object.entries((cfg.values as Record<string, string>) || {})) values[cid] = render(tpl, ctx());
        const created = await createItem(target as never, { name: render(String(cfg.name || "New item"), ctx()), group: String(cfg.group || ""), values }, actor);
        item = created.toObject() as unknown as ItemDoc;
        board = target as unknown as BoardDoc;
        steps.push({ action: type, ok: true, detail: `Created “${item!.name}”` });
        continue;
      }
      if (type === "reply_message") {
        const convId = (input.payload as { conversationId?: string })?.conversationId;
        if (!convId) throw new Error("Only works with the “message arrives” trigger");
        const { sendReply } = await import("@/lib/inbox");
        const text = render(String(cfg.text || ""), ctx());
        const m = await sendReply(convId, text, { label: actor.label || "Automation" });
        steps.push({ action: type, ok: !m.delivery.startsWith("failed"), detail: `${text.slice(0, 80)} (${m.delivery})` });
        continue;
      }
      if (!item) throw new Error("No item in context (add a “Create an item” step first)");
      if (type === "set_column") {
        const col = board.columns.find((c) => c.id === cfg.column);
        if (!col) throw new Error("Column not found");
        const rendered = typeof cfg.value === "string" ? render(cfg.value, ctx()) : cfg.value;
        const { item: upd } = await updateItem(String(item._id), { values: { [col.id]: coerceValue(col, rendered) } }, actor, { raw: true });
        item = upd.toObject() as unknown as ItemDoc;
        steps.push({ action: type, ok: true, detail: `${col.title} → ${displayValue(col, item!.values[col.id]) || "(empty)"}` });
      } else if (type === "move_to_group") {
        const g = board.groups.find((x) => x.id === cfg.group);
        if (!g) throw new Error("Group not found");
        const { item: upd } = await updateItem(String(item._id), { group: g.id }, actor);
        item = upd.toObject() as unknown as ItemDoc;
        steps.push({ action: type, ok: true, detail: `Moved to ${g.title}` });
      } else if (type === "add_note") {
        const text = render(String(cfg.text || ""), ctx());
        await Activity.create({ workspace: a.workspace, board: board._id, item: item._id, type: "note", actorLabel: actor.label, text });
        steps.push({ action: type, ok: true, detail: text.slice(0, 120) });
      } else if (type === "notify") {
        const text = render(String(cfg.text || "Automation ran"), ctx());
        let users: unknown[] = [];
        if (cfg.target === "all") users = (await Workspace.findById(a.workspace).lean())?.members.map((m) => m.user) || [];
        else if (cfg.target === "person_column") {
          const v = item.values?.[String(cfg.column || "")];
          if (v) users = [v];
        } else if (cfg.target) users = [cfg.target];
        await Notification.insertMany(users.map((u) => ({ user: u, workspace: a.workspace, text, link: `/app/boards/${board._id}?item=${item!._id}` })));
        steps.push({ action: type, ok: true, detail: `Notified ${users.length} user(s)` });
      } else if (type === "send_webhook") {
        const url = render(String(cfg.url || ""), ctx());
        if (!/^https?:\/\//.test(url)) throw new Error("Invalid URL");
        const body = cfg.body ? render(String(cfg.body), ctx()) : JSON.stringify({ automation: a.name, item: publicItem(board as never, item as never), payload: input.payload });
        const r = await outboundFetch(url, { method: String(cfg.method || "POST"), headers: { "Content-Type": "application/json", "User-Agent": "OrbitCRM-Automations/1.0" }, body });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        steps.push({ action: type, ok: true, detail: `HTTP ${r.status} from ${new URL(url).host}` });
      } else if (type === "app_action") {
        const inst = await Installation.findOne({ _id: cfg.installation, workspace: a.workspace, active: true }).lean();
        if (!inst) throw new Error("App is not installed");
        const app = await App.findById(inst.app).select("+signingSecret name actions").lean();
        const def = app?.actions.find((x) => x.key === cfg.action);
        if (!app || !def?.url) throw new Error("App action not found");
        const inputs: Record<string, string> = {};
        for (const [k, tpl] of Object.entries((cfg.inputs as Record<string, string>) || {})) inputs[k] = render(tpl, ctx());
        const body = JSON.stringify({ action: def.key, inputs, item: publicItem(board as never, item as never), workspace_id: String(a.workspace), installation_id: String(inst._id), settings: inst.settings || {} });
        const base = process.env.NEXTAUTH_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";
        const target = def.url.startsWith("/") ? new URL(def.url, base).toString() : def.url;
        // Built-in demo apps live on this server (relative URL); everything else goes through the SSRF guard.
        const r = def.url.startsWith("/")
          ? await fetch(target, { method: "POST", headers: { "Content-Type": "application/json", "X-Orbit-Signature": sign(app.signingSecret || "", body) }, body, signal: AbortSignal.timeout(10000) })
          : await outboundFetch(target, { method: "POST", headers: { "Content-Type": "application/json", "X-Orbit-Signature": sign(app.signingSecret || "", body) }, body, timeoutMs: 10000 });
        const resp = (await r.json().catch(() => ({}))) as { outputs?: Record<string, unknown>; error?: string };
        if (!r.ok) throw new Error(resp.error || `HTTP ${r.status}`);
        Object.assign(outputs, resp.outputs || {});
        const vals: Record<string, unknown> = {};
        for (const [outKey, colId] of Object.entries((cfg.outputMap as Record<string, string>) || {})) {
          const col = board.columns.find((c) => c.id === colId);
          if (col && outKey in outputs) vals[col.id] = coerceValue(col, outputs[outKey]);
        }
        if (Object.keys(vals).length) {
          const { item: upd } = await updateItem(String(item._id), { values: vals }, actor, { raw: true });
          item = upd.toObject() as unknown as ItemDoc;
        }
        steps.push({ action: type, ok: true, detail: `${app.name} → ${def.label}: ${JSON.stringify(resp.outputs || {}).slice(0, 100)}` });
      } else {
        throw new Error(`Unknown action ${type}`);
      }
    } catch (e) {
      failed = true;
      steps.push({ action: type, ok: false, detail: e instanceof Error ? e.message : String(e) });
      break;
    }
  }
  await AutomationRun.create({ workspace: a.workspace, automation: a._id, status: failed ? "failed" : "success", trigger: a.trigger.type, item: item?._id, steps, durationMs: Date.now() - t0 });
  await Automation.updateOne({ _id: a._id }, { $inc: { runCount: 1 }, $set: { lastRunAt: new Date() } });
  return { status: failed ? ("failed" as const) : ("success" as const), steps, item };
}

/** Catch hook: external system POSTs JSON → automation runs with payload. */
export async function runCatchHook(hookToken: string, payload: unknown) {
  const a = await Automation.findOne({ hookToken, enabled: true, "trigger.type": "catch_hook" }).lean();
  if (!a) return null;
  const board = await Board.findById(a.board).lean();
  if (!board) return null;
  // Optional: update an existing item when payload carries item_id
  const pid = (payload as { item_id?: string })?.item_id;
  const item = pid ? await Item.findOne({ _id: pid, board: board._id }).lean().catch(() => null) : null;
  return runAutomation(a as unknown as AutoDoc, { board: board as unknown as BoardDoc, item: (item as unknown as ItemDoc) || null, payload, depth: 0 });
}

/** App trigger fired through the public API. */
export async function runAppTrigger(workspace: string, appId: string, key: string, body: { item_id?: string; board_id?: string; data?: unknown }) {
  const q: Record<string, unknown> = { workspace, enabled: true, "trigger.type": "app_trigger", "trigger.config.app": appId, "trigger.config.key": key };
  if (body.board_id) q.board = body.board_id;
  const autos = await Automation.find(q).lean();
  const results = [];
  for (const a of autos) {
    const board = await Board.findById(a.board).lean();
    if (!board) continue;
    const item = body.item_id ? await Item.findOne({ _id: body.item_id, board: board._id }).lean().catch(() => null) : null;
    const r = await runAutomation(a as unknown as AutoDoc, { board: board as unknown as BoardDoc, item: (item as unknown as ItemDoc) || null, payload: body.data ?? {}, depth: 0 });
    results.push({ automation: a.name, status: r.status });
  }
  return results;
}

/** Inbox trigger: a customer message arrived. Runs automations on the channel's lead board. */
export async function runMessageAutomations(
  ch: { _id: unknown; workspace: unknown; type: string; name: string; settings: Record<string, unknown> },
  conv: { _id: unknown; item?: unknown; contact: { name?: string; email?: string; phone?: string } },
  msg: { text: string; isNew: boolean }
) {
  const autos = await Automation.find({ workspace: ch.workspace, enabled: true, "trigger.type": "message_received" }).lean();
  for (const a of autos) {
    const cfg = ((a.trigger as { config?: Record<string, unknown> }).config || {}) as Record<string, unknown>;
    if (cfg.channel && String(cfg.channel) !== String(ch._id)) continue;
    if (cfg.onlyNew && !msg.isNew) continue;
    if (cfg.contains && !msg.text.toLowerCase().includes(String(cfg.contains).toLowerCase())) continue;
    const board = await Board.findById(a.board).lean();
    if (!board) continue;
    const item = conv.item ? await Item.findOne({ _id: conv.item, board: board._id }).lean() : null;
    await runAutomation(a as unknown as AutoDoc, {
      board: board as unknown as BoardDoc,
      item: (item as unknown as ItemDoc) || null,
      payload: { text: msg.text, isNew: msg.isNew, channel: ch.name, channelType: ch.type, contact: conv.contact, conversationId: String(conv._id) },
      depth: 0,
    });
  }
}
