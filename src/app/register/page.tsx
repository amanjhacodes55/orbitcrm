import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { googleEnabled, sessionUserId } from "@/lib/auth";
import { getCtx } from "@/lib/context";

export const metadata = { title: "Sign up" };

export default async function Page() {
  // Only redirect when the session points at a real account; a stale cookie (deleted user) is cleared client-side.
  const ctx = await getCtx();
  if (ctx) redirect(ctx.workspace.id ? "/app" : "/onboarding");
  const stale = !!(await sessionUserId());
  return (
    <Suspense>
      <AuthForm mode="register" google={googleEnabled} stale={stale} />
    </Suspense>
  );
}
