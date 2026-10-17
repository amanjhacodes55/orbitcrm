import { dbConnect } from "@/lib/db";
import { err, json, rateLimit } from "@/lib/api";
import { runCatchHook } from "@/lib/automation";

/** Public catch-hook endpoint: POST any JSON (or form data) to trigger the automation. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!rateLimit(`hook:${token}`, 60, 60_000)) return err("Rate limited", 429);
  await dbConnect();
  const type = req.headers.get("content-type") || "";
  let payload: unknown = {};
  try {
    if (type.includes("application/json")) payload = await req.json();
    else if (type.includes("form")) payload = Object.fromEntries((await req.formData()).entries());
    else payload = { body: (await req.text()).slice(0, 20000) };
  } catch {
    return err("Body must be valid JSON");
  }
  const r = await runCatchHook(token, payload);
  if (!r) return err("Unknown or disabled hook", 404);
  return json({ ok: r.status !== "failed", status: r.status, item_id: r.item ? String(r.item._id) : null, steps: r.steps });
}

export async function GET() {
  return json({ ok: true, message: "OrbitCRM catch hook — send a POST request with a JSON body." });
}
