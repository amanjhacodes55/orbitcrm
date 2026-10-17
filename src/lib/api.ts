import "server-only";
import { NextResponse } from "next/server";
import { getCtx, type Ctx } from "@/lib/context";
import { dbConnect } from "@/lib/db";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

type H<P> = (req: Request, ctx: Ctx, params: P) => Promise<Response>;

/** Route wrapper: signed-in user with a workspace (optionally admin of it / platform admin). */
export function route<P = Record<string, string>>(h: H<P>, o: { wsAdmin?: boolean; platformAdmin?: boolean; noWorkspace?: boolean } = {}) {
  return async (req: Request, { params }: { params: Promise<P> }) => {
    await dbConnect();
    const ctx = await getCtx();
    if (!ctx) return err("Please sign in.", 401);
    if (!o.noWorkspace && !ctx.workspace.id) return err("Create a workspace first.", 400);
    if (o.wsAdmin && ctx.workspace.role === "member") return err("Only workspace admins can do that.", 403);
    if (o.platformAdmin && !ctx.isPlatformAdmin) return err("Platform admins only.", 403);
    try {
      return await h(req, ctx, await params);
    } catch (e) {
      if (e instanceof SyntaxError) return err("Invalid JSON body.");
      console.error(e);
      return err(e instanceof Error ? e.message : "Something went wrong", 500);
    }
  };
}

const buckets = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  buckets.set(key, arr);
  return true;
}
