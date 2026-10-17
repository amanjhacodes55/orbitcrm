"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Users } from "lucide-react";
import { api } from "@/lib/client";
import { Logo } from "@/components/ui";
import Orbi from "@/components/art/Orbi";

export default function Onboarding({ name, hasWorkspace }: { name: string; hasWorkspace: boolean }) {
  const router = useRouter();
  const [ws, setWs] = useState(`${name.split(" ")[0]}'s team`);
  const [samples, setSamples] = useState(true);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function create() {
    setBusy("create");
    const r = await api("/api/workspaces", { method: "POST", json: { name: ws, samples } });
    setBusy("");
    if (!r.ok) return setError(r.error);
    router.push("/app");
    router.refresh();
  }
  async function join() {
    setBusy("join");
    const c = code.trim().split("/").pop() || "";
    const r = await api("/api/workspaces/join", { method: "POST", json: { code: c } });
    setBusy("");
    if (!r.ok) return setError(r.error);
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-5">
        <div className="flex items-center justify-between"><Logo /><Orbi pose="wave" size={90} /></div>
        <div className="card p-7">
          <h1 className="text-2xl font-bold">{hasWorkspace ? "Create another workspace" : `Welcome, ${name.split(" ")[0]}! 👋`}</h1>
          <p className="mt-1 text-sm text-muted">A workspace holds your boards, automations, apps and team.</p>
          <label className="label mt-6">Workspace name</label>
          <input className="input" value={ws} onChange={(e) => setWs(e.target.value)} />
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <input type="checkbox" className="mt-1 accent-[var(--brand)]" checked={samples} onChange={(e) => setSamples(e.target.checked)} />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="size-4 text-brand" /> Start with a ready-to-use CRM (recommended)
              </span>
              <span className="text-xs text-muted">Leads, Deals pipeline and Contacts boards with sample data, 4 working automations, and the Softphone + Lead Scorer apps installed.</span>
            </span>
          </label>
          <button onClick={create} disabled={!!busy || ws.trim().length < 2} className="btn btn-primary mt-5 w-full">
            {busy === "create" && <Loader2 className="size-4 animate-spin" />} Create workspace
          </button>
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4 text-muted" /> Joining your team? Paste the invite link or code
          </p>
          <div className="mt-3 flex gap-2">
            <input className="input" placeholder="https://…/join/AbC123xyz" value={code} onChange={(e) => setCode(e.target.value)} />
            <button onClick={join} disabled={!!busy || !code.trim()} className="btn btn-secondary">
              {busy === "join" && <Loader2 className="size-4 animate-spin" />} Join
            </button>
          </div>
        </div>
        {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
