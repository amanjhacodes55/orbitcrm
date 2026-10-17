"use client";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client";
import { Logo } from "@/components/ui";

export default function OAuthConsent({ app, scopes, workspaces, current, redirectUri, state, user }: { app: { slug: string; name: string; icon: string; tagline: string }; scopes: string[]; workspaces: { id: string; name: string }[]; current: string; redirectUri: string; state: string; user: string }) {
  const [ws, setWs] = useState(workspaces.some((w) => w.id === current) ? current : workspaces[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function allow() {
    setBusy(true);
    await api("/api/workspaces/switch", { method: "POST", json: { id: ws } });
    const r = await api<{ redirect: string }>(`/api/marketplace/${app.slug}/install`, { method: "POST", json: { redirect_uri: redirectUri, state } });
    if (!r.ok) { setBusy(false); return setError(r.error); }
    window.location.href = r.data.redirect;
  }
  const deny = () => { window.location.href = `${redirectUri}${redirectUri.includes("?") ? "&" : "?"}error=access_denied&state=${encodeURIComponent(state)}`; };
  return (
    <div className="card w-full max-w-md p-7">
      <Logo />
      <div className="mt-6 flex items-center gap-3"><span className="text-4xl">{app.icon}</span><div><p className="text-lg font-bold">{app.name}</p><p className="text-sm text-muted">{app.tagline}</p></div></div>
      <p className="mt-5 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-brand" /> wants access to your OrbitCRM workspace</p>
      <ul className="mt-3 space-y-1.5 text-sm">{scopes.map((s) => <li key={s} className="rounded-md bg-surface-2 px-3 py-1.5">✓ {s}</li>)}</ul>
      {workspaces.length === 0 ? <p className="mt-4 text-sm text-danger">You need to be an admin of a workspace to install apps.</p> : (
        <div className="mt-4"><label className="label">Workspace</label><select className="input" value={ws} onChange={(e) => setWs(e.target.value)}>{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <p className="mt-4 text-xs text-muted">Signed in as {user}. You&apos;ll be redirected to <code>{new URL(redirectUri).host}</code>.</p>
      <div className="mt-5 flex gap-2"><button className="btn btn-secondary flex-1" onClick={deny}>Cancel</button><button className="btn btn-primary flex-1" disabled={busy || !ws} onClick={allow}>{busy && <Loader2 className="size-4 animate-spin" />} Allow</button></div>
    </div>
  );
}
