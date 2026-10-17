"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";

export default function ReviewActions({ id, status, checksOk }: { id: string; status: string; checksOk: boolean }) {
  const [notes, setNotes] = useState("");
  const router = useRouter();
  const toast = useToast();
  const act = async (action: string) => {
    const r = await api(`/api/admin/apps/${id}`, { method: "POST", json: { action, notes } });
    if (!r.ok) return toast(r.error, "error");
    toast(`App ${action}d`, "success");
    router.refresh();
  };
  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
      <input className="input min-w-60 flex-1" placeholder="Note to developer (required to reject/unlist)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {status !== "approved" && <button className="btn btn-primary" disabled={!checksOk} title={checksOk ? "" : "Automated checks failing"} onClick={() => act("approve")}>Approve</button>}
      {status !== "rejected" && <button className="btn btn-danger" onClick={() => act("reject")}>Reject</button>}
      {status === "approved" && <button className="btn btn-secondary" onClick={() => act("unlist")}>Unlist</button>}
    </div>
  );
}
