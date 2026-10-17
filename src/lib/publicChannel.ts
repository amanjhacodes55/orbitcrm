import "server-only";
import { NextResponse } from "next/server";
import { Channel } from "@/lib/models";

export const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export const pjson = (d: unknown, status = 200) => NextResponse.json(d, { status, headers: cors });
export async function activeChannel(token: string, type?: string) {
  const ch = await Channel.findOne({ token, active: true }).lean();
  if (!ch || (type && ch.type !== type)) return null;
  return ch;
}
