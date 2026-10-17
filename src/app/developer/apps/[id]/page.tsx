import { notFound, redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { getCtx } from "@/lib/context";
import { App, SCOPES } from "@/lib/models";
import { appChecks } from "@/lib/reviewChecks";
import { plain } from "@/lib/serialize";
import AppEditor from "@/components/dev/AppEditor";

export const metadata = { title: "Edit app" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCtx();
  if (!ctx) redirect("/login?next=/developer");
  if (!isValidObjectId(id)) notFound();
  const app = await App.findOne({ _id: id, developer: ctx.user.id }).select("+signingSecret").lean();
  if (!app) notFound();
  return <AppEditor initial={plain(app) as never} review={appChecks(app as never)} scopes={SCOPES} origin={process.env.NEXTAUTH_URL || "http://localhost:3001"} />;
}
