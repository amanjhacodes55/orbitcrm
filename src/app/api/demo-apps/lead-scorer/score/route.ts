import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { App } from "@/lib/models";

/**
 * Reference implementation of an app ACTION endpoint (normally hosted on the developer's own server).
 * 1. verify X-Orbit-Signature (HMAC-SHA256 of the raw body with the app's signing secret)
 * 2. do the work   3. return { outputs }
 */
const FREE = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "proton.me"];

export async function POST(req: Request) {
  await dbConnect();
  const raw = await req.text();
  const app = await App.findOne({ slug: "lead-scorer" }).select("+signingSecret").lean();
  const expected = "sha256=" + createHmac("sha256", app?.signingSecret || "").update(raw).digest("hex");
  const got = req.headers.get("x-orbit-signature") || "";
  if (got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  const body = JSON.parse(raw) as { inputs: Record<string, string>; settings?: { preferredSources?: string; freeMailPenalty?: number } };
  const { email = "", company = "", source = "" } = body.inputs || {};
  const preferred = (body.settings?.preferredSources || "Referral, Website").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const penalty = Number(body.settings?.freeMailPenalty ?? 25);
  let score = 40;
  const reasons: string[] = [];
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (!domain) { score -= 20; reasons.push("no email"); }
  else if (FREE.includes(domain)) { score -= penalty; reasons.push("free email"); }
  else { score += 25; reasons.push("business email"); }
  if (company && company !== "—" && company.toLowerCase() !== "freelancer") { score += 15; reasons.push("has company"); }
  if (preferred.includes(source.toLowerCase())) { score += 20; reasons.push(`${source} source`); }
  if (/\.(ai|io)$/.test(domain)) { score += 5; reasons.push("tech domain"); }
  score = Math.max(0, Math.min(100, score));
  const grade = score >= 75 ? "A" : score >= 55 ? "B" : score >= 35 ? "C" : "D";
  return NextResponse.json({ outputs: { score, grade, reason: reasons.join(", ") } });
}
