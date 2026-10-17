"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/ui";

export default function InstallButton({ slug, name, installed, canInstall, scopes }: { slug: string; name: string; installed: boolean; canInstall: boolean; scopes: { key: string; label: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (installed)
    return (
      <div className="flex gap-2">
        <span className="btn btn-secondary pointer-events-none !text-success"><CheckCircle2 className="size-4" /> Installed</span>
        <button className="btn btn-secondary" onClick={() => router.push("/app/apps")}>Manage</button>
      </div>
    );
  async function install() {
    setBusy(true);
    const r = await api<{ redirect: string }>(`/api/marketplace/${slug}/install`, { method: "POST", json: {} });
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    if (r.data.redirect) {
      window.location.href = r.data.redirect; // OAuth app: continue on the app's site with ?code=
      return;
    }
    toast(`${name} installed`, "success");
    setOpen(false);
    router.push("/app/apps");
    router.refresh();
  }
  return (
    <>
      <button className="btn btn-primary !px-6" disabled={!canInstall} title={canInstall ? "" : "Ask a workspace admin to install"} onClick={() => setOpen(true)}>Install app</button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Install ${name}?`} footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={install}>{busy && <Loader2 className="size-4 animate-spin" />} Allow & install</button></>}>
        <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-brand" /> {name} will be able to:</p>
        <ul className="mt-3 space-y-2 text-sm">{scopes.map((s) => <li key={s.key} className="flex gap-2 rounded-lg bg-surface-2 px-3 py-2"><span className="text-success">✓</span>{s.label}<code className="ml-auto text-[10px]">{s.key}</code></li>)}</ul>
        <p className="mt-3 text-xs text-muted">Access is limited to this workspace. You can uninstall at any time, which revokes its token immediately.</p>
      </Modal>
    </>
  );
}
