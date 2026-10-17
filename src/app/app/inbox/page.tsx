import { Suspense } from "react";
import { requireCtx } from "@/lib/context";
import { Channel } from "@/lib/models";
import { memberMap } from "@/lib/access";
import { plain } from "@/lib/serialize";
import Inbox from "@/components/Inbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

export default async function Page() {
  const ctx = await requireCtx();
  const [channels, members] = await Promise.all([Channel.find({ workspace: ctx.workspace.id }).select("name type active").lean(), memberMap(ctx.workspace.id)]);
  return <Suspense><Inbox channels={plain(channels) as never} members={members} me={ctx.user.id} canAdmin={ctx.workspace.role !== "member"} /></Suspense>;
}
