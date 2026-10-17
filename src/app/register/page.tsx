import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { googleEnabled, sessionUserId } from "@/lib/auth";

export const metadata = { title: "Sign up" };

export default async function Page() {
  if (await sessionUserId()) redirect("/app");
  return (
    <Suspense>
      <AuthForm mode="register" google={googleEnabled} />
    </Suspense>
  );
}
