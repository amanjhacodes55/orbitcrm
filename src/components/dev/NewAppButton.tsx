"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/ui";

export default function NewAppButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🧩");
  const router = useRouter();
  const toast = useToast();
  async function create() {
    const r = await api<{ app: { _id: string }; clientSecret: string }>("/api/dev/apps", { method: "POST", json: { name, icon } });
    if (!r.ok) return toast(r.error, "error");
    try { sessionStorage.setItem(`orbit-secret:${r.data.app._id}`, r.data.clientSecret); } catch {}
    router.push(`/developer/apps/${r.data.app._id}`);
  }
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus className="size-4" /> Create app</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create an app" footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={name.trim().length < 2} onClick={create}>Create</button></>}>
        <div className="flex gap-3">
          <div><label className="label">Icon</label><input className="input !w-16 text-center text-xl" maxLength={4} value={icon} onChange={(e) => setIcon(e.target.value)} /></div>
          <div className="flex-1"><label className="label">App name</label><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Twilio Dialer" /></div>
        </div>
      </Modal>
    </>
  );
}
