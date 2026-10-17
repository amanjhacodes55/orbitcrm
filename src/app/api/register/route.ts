import bcrypt from "bcryptjs";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models";
import { err, json, rateLimit } from "@/lib/api";

const Body = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), password: z.string().min(6).max(128) });

export async function POST(req: Request) {
  if (!rateLimit(`reg:${req.headers.get("x-forwarded-for") || "l"}`, 10, 3600_000)) return err("Too many sign-ups, try later.", 429);
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return err(p.error.issues[0].path[0] + ": " + p.error.issues[0].message);
  await dbConnect();
  if (await User.exists({ email: p.data.email })) return err("An account with this email exists — sign in instead.");
  await User.create({ name: p.data.name, email: p.data.email, passwordHash: await bcrypt.hash(p.data.password, 10), providers: ["credentials"] });
  return json({ ok: true });
}
