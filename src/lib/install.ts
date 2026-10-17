import "server-only";
import { App, Installation, OAuthCode } from "@/lib/models";
import { sha256, token } from "@/lib/ids";

/** Install (or re-install) an app in a workspace. Returns a fresh access token (shown to the app once). */
export async function installApp(appId: string, workspace: string, userId: string) {
  const app = await App.findById(appId).lean();
  if (!app || (app.status !== "approved" && String(app.developer) !== userId)) throw new Error("App not available");
  const raw = token("orb_inst", 24);
  const existing = await Installation.findOne({ app: app._id, workspace });
  const inst = existing
    ? Object.assign(existing, { active: true, scopes: app.scopes, tokenHash: sha256(raw), tokenPrefix: raw.slice(0, 14), installedBy: userId })
    : new Installation({ app: app._id, workspace, installedBy: userId, scopes: app.scopes, tokenHash: sha256(raw), tokenPrefix: raw.slice(0, 14) });
  await inst.save();
  if (!existing) await App.updateOne({ _id: app._id }, { $inc: { installs: 1 } });
  const code = token("orb_code", 18);
  await OAuthCode.create({ code, installation: inst._id, app: app._id, token: raw });
  return { inst, code, app };
}
