import { redirect } from "next/navigation";
import { getCtx } from "@/lib/context";
import { App, SCOPES, Workspace } from "@/lib/models";
import { Logo } from "@/components/ui";
import OAuthConsent from "@/components/dev/OAuthConsent";

export const dynamic = "force-dynamic";
export const metadata = { title: "Authorize app" };

export default async function Authorize({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(sp).toString();
  const ctx = await getCtx();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${qs}`)}`);
  const app = await App.findOne({ clientId: sp.client_id }).lean();
  const fail = (msg: string) => (
    <div className="flex min-h-screen items-center justify-center p-4"><div className="card max-w-md p-6 text-center"><Logo className="justify-center" /><p className="mt-4 font-semibold text-danger">{msg}</p></div></div>
  );
  if (!app) return fail("Unknown client_id.");
  if (app.status !== "approved" && String(app.developer) !== ctx.user.id) return fail("This app isn't published yet.");
  if (!sp.redirect_uri || !app.redirectUrls.includes(sp.redirect_uri)) return fail("redirect_uri is not registered for this app.");
  const wss = await Workspace.find({ members: { $elemMatch: { user: ctx.user.id, role: { $in: ["owner", "admin"] } } } }).select("name").lean();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-soft via-bg to-bg p-4">
      <OAuthConsent
        app={{ slug: app.slug, name: app.name, icon: app.icon, tagline: app.tagline }}
        scopes={app.scopes.map((s) => SCOPES[s as keyof typeof SCOPES] || s)}
        workspaces={wss.map((w) => ({ id: String(w._id), name: w.name }))}
        current={ctx.workspace.id}
        redirectUri={sp.redirect_uri}
        state={sp.state || ""}
        user={ctx.user.email}
      />
    </div>
  );
}
