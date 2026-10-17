import "server-only";
import { createHmac } from "node:crypto";
import { Webhook, WebhookDelivery } from "@/lib/models";
import { outboundFetch } from "@/lib/outbound";
import type { Actor } from "@/lib/items";
import type { Col } from "@/lib/values";

export const EVENTS = ["item.created", "item.updated", "item.deleted", "activity.created"] as const;
export type EventName = (typeof EVENTS)[number];

export type EventData = {
  workspace: string;
  board: { _id: unknown; name?: string; columns: Col[]; groups: { id: string; title?: string }[] } | null;
  item?: { _id: unknown; name: string; values: Record<string, unknown>; group: string } | null;
  changes: { column: string; title: string; from: unknown; to: unknown }[];
  actor: Actor;
  activity?: unknown;
};

/** Item as sent to webhooks/apps: values keyed by column id plus a readable "fields" map by title. */
export function publicItem(board: EventData["board"], item: EventData["item"]) {
  if (!item) return null;
  const fields: Record<string, unknown> = {};
  for (const c of board?.columns || []) {
    const v = item.values?.[c.id];
    fields[c.title] = (c.type === "status" || c.type === "dropdown") && v ? c.options?.find((o) => o.id === v)?.label ?? v : v ?? null;
  }
  return { id: String(item._id), name: item.name, board_id: String(board?._id ?? ""), group: item.group, values: item.values, fields };
}

export async function emit(event: EventName, data: EventData) {
  // Deliver this event's webhooks first (so receivers see events in causal order), then run
  // automations, which may cascade into further events. Both are best-effort.
  const delivery = deliverWebhooks(event, data).catch((e) => console.error("webhook error", e));
  try {
    const { runAutomationsForEvent } = await import("@/lib/automation");
    await runAutomationsForEvent(event, data);
  } catch (e) {
    console.error("automation error", e);
  }
  await delivery;
}

export function sign(secret: string, body: string) {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

async function deliverWebhooks(event: EventName, data: EventData) {
  const hooks = await Webhook.find({ workspace: data.workspace, active: true, events: event }).lean();
  for (const h of hooks) {
    if (h.board && data.board && String(h.board) !== String(data.board._id)) continue;
    const body = JSON.stringify({
      event,
      occurred_at: new Date().toISOString(),
      workspace_id: data.workspace,
      board: data.board ? { id: String(data.board._id), name: data.board.name } : null,
      item: publicItem(data.board, data.item),
      changes: data.changes,
      activity: data.activity ?? undefined,
    });
    const t0 = Date.now();
    let status = 0;
    let error = "";
    try {
      const r = await outboundFetch(h.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "OrbitCRM-Webhooks/1.0", "X-Orbit-Event": event, "X-Orbit-Signature": sign(h.secret, body) },
        body,
      });
      status = r.status;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const ok = status >= 200 && status < 300;
    await WebhookDelivery.create({ webhook: h._id, event, status, ok, durationMs: Date.now() - t0, error });
    await Webhook.updateOne(
      { _id: h._id },
      ok ? { $set: { lastStatus: status, lastDeliveryAt: new Date(), failures: 0 } } : { $set: { lastStatus: status, lastDeliveryAt: new Date() }, $inc: { failures: 1 } }
    );
    // auto-disable after 20 consecutive failures
    await Webhook.updateOne({ _id: h._id, failures: { $gte: 20 } }, { $set: { active: false } });
  }
}
