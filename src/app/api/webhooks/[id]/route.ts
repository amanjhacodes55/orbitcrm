import { isValidObjectId } from "mongoose";
import { route, err, json } from "@/lib/api";
import { Webhook, WebhookDelivery } from "@/lib/models";
import { sign } from "@/lib/events";
import { outboundFetch } from "@/lib/outbound";
import { plain } from "@/lib/serialize";

type P = { id: string };
const find = (ws: string, id: string) => (isValidObjectId(id) ? Webhook.findOne({ _id: id, workspace: ws }) : null);

export const GET = route<P>(async (_req, ctx, { id }) => {
  const h = await find(ctx.workspace.id, id);
  if (!h) return err("Not found", 404);
  return json({ deliveries: plain(await WebhookDelivery.find({ webhook: h._id }).sort({ createdAt: -1 }).limit(30).lean()) });
});

// toggle active, or send a test ping
export const POST = route<P>(async (req, ctx, { id }) => {
  const h = await find(ctx.workspace.id, id);
  if (!h) return err("Not found", 404);
  const { action } = await req.json();
  if (action === "toggle") {
    h.active = !h.active;
    h.failures = 0;
    await h.save();
    return json({ active: h.active });
  }
  const body = JSON.stringify({ event: "ping", occurred_at: new Date().toISOString(), workspace_id: ctx.workspace.id });
  const t0 = Date.now();
  let status = 0;
  let error = "";
  try {
    const r = await outboundFetch(h.url, { method: "POST", headers: { "Content-Type": "application/json", "X-Orbit-Event": "ping", "X-Orbit-Signature": sign(h.secret, body) }, body });
    status = r.status;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  await WebhookDelivery.create({ webhook: h._id, event: "ping", status, ok: status >= 200 && status < 300, durationMs: Date.now() - t0, error });
  return json({ status, error });
}, { wsAdmin: true });

export const DELETE = route<P>(async (_req, ctx, { id }) => {
  const h = await find(ctx.workspace.id, id);
  if (!h) return err("Not found", 404);
  await h.deleteOne();
  return json({ ok: true });
}, { wsAdmin: true });
