import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Health check for Render / uptime monitors: 200 when the app and database respond. */
export async function GET() {
  try {
    await dbConnect();
    await mongoose.connection.db!.admin().ping();
    return Response.json({ ok: true, db: "up" });
  } catch (e) {
    return Response.json({ ok: false, db: "down", error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
