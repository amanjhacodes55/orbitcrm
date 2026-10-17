import { dbConnect } from "@/lib/db";
import { err, json } from "@/lib/api";
import { App, OAuthCode } from "@/lib/models";
import { sha256 } from "@/lib/ids";

/** OAuth 2.0 authorization_code exchange. Body: grant_type, code, client_id, client_secret (JSON or form). */
export async function POST(req: Request) {
  await dbConnect();
  const ct = req.headers.get("content-type") || "";
  const b = ct.includes("json") ? await req.json().catch(() => ({})) : Object.fromEntries((await req.formData().catch(() => new FormData())).entries());
  if (b.grant_type !== "authorization_code") return err("unsupported_grant_type");
  const app = await App.findOne({ clientId: b.client_id }).select("+clientSecretHash").lean();
  if (!app || app.clientSecretHash !== sha256(String(b.client_secret || ""))) return err("invalid_client", 401);
  const code = await OAuthCode.findOneAndUpdate({ code: b.code, app: app._id, used: false }, { used: true });
  if (!code) return err("invalid_grant");
  return json({ access_token: code.token, token_type: "Bearer", installation_id: String(code.installation), scope: app.scopes.join(" ") });
}
