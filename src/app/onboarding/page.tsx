import { redirect } from "next/navigation";
import { getCtx } from "@/lib/context";
import Onboarding from "@/components/Onboarding";

export const metadata = { title: "Set up your workspace" };

export default async function Page() {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  return <Onboarding name={ctx.user.name} hasWorkspace={!!ctx.workspace.id} />;
}
