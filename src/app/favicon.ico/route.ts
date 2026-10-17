import { NextResponse } from "next/server";
/** Browsers request /favicon.ico for plain-HTML pages (embedded apps, chat widget) — point them at the logo. */
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/logo.svg", req.url), 308);
}
