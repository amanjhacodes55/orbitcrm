import { route, err, json } from "@/lib/api";
import { App } from "@/lib/models";
import { installApp } from "@/lib/install";

export const POST = route<{ slug: string }>(async (req, ctx, { slug }) => {
  const app = await App.findOne({ slug }).lean();
  if (!app) return err("App not found", 404);
  const body = await req.json().catch(() => ({}));
  const { inst, code } = await installApp(String(app._id), ctx.workspace.id, ctx.user.id);
  // OAuth apps: send the user back to the app with an authorization code.
  const redirect = (body.redirect_uri && app.redirectUrls.includes(body.redirect_uri) ? body.redirect_uri : app.redirectUrls[0]) || "";
  const url = redirect ? `${redirect}${redirect.includes("?") ? "&" : "?"}code=${code}&state=${encodeURIComponent(body.state || "")}` : "";
  return json({ installation: String(inst._id), redirect: url });
}, { wsAdmin: true });
