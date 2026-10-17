import "server-only";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { ApiKey, App, Installation } from "@/lib/models";
import { sha256 } from "@/lib/ids";
import { rateLimit } from "@/lib/api";

export type ApiCtx = { workspace: string; scopes: string[]; app?: { id: string; name: string; slug: string }; installation?: string; label: string };

const ALL = ["boards.read", "items.read", "items.write", "activities.write", "webhooks.write", "triggers.fire"];
export const apiErr = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Bearer token = workspace API key (orb_key_…) or app installation token (orb_inst_…). */
export function v1<P = Record<string, string>>(scope: string | null, h: (req: Request, ctx: ApiCtx, params: P) => Promise<Response>) {
  return async (req: Request, { params }: { params: Promise<P> }) => {
    const raw = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!raw) return apiErr("Missing Authorization: Bearer <token>", 401);
    if (!rateLimit(`v1:${raw.slice(0, 20)}`, 300, 60_000)) return apiErr("Rate limit: 300 requests/minute", 429);
    await dbConnect();
    let ctx: ApiCtx | null = null;
    if (raw.startsWith("orb_key_")) {
      const k = await ApiKey.findOneAndUpdate({ hash: sha256(raw) }, { lastUsedAt: new Date() }).lean();
      if (k) ctx = { workspace: String(k.workspace), scopes: ALL, label: `API key “${k.name}”` };
    } else if (raw.startsWith("orb_inst_")) {
      const inst = await Installation.findOne({ tokenHash: sha256(raw), active: true }).lean();
      const app = inst ? await App.findById(inst.app).select("name slug").lean() : null;
      if (inst && app) ctx = { workspace: String(inst.workspace), scopes: inst.scopes, app: { id: String(app._id), name: app.name, slug: app.slug }, installation: String(inst._id), label: app.name };
    }
    if (!ctx) return apiErr("Invalid or revoked token", 401);
    if (scope && !ctx.scopes.includes(scope)) return apiErr(`This token lacks the “${scope}” scope`, 403);
    try {
      return await h(req, ctx, await params);
    } catch (e) {
      if (e instanceof SyntaxError) return apiErr("Invalid JSON body");
      console.error(e);
      return apiErr(e instanceof Error ? e.message : "Server error", 500);
    }
  };
}
