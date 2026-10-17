"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Phone, PhoneOff, X, Minus, PhoneCall } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import AppFrame, { type HostEvent } from "@/components/AppFrame";

export type DialerApp = { installationId: string; name: string; icon: string; url: string };
type DialReq = { phone: string; itemId?: string; itemName?: string; onLogged?: () => void };

const Ctx = createContext<(r: DialReq) => void>(() => {});
export const useDialer = () => useContext(Ctx);

export function DialerProvider({ apps, user, workspace, children }: { apps: DialerApp[]; user: Record<string, unknown>; workspace: Record<string, unknown>; children: React.ReactNode }) {
  const [req, setReq] = useState<DialReq | null>(null);
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(false);
  const [tab, setTab] = useState<string>(apps[0]?.installationId || "manual");
  const [ev, setEv] = useState<HostEvent | null>(null);

  const dial = useCallback((r: DialReq) => {
    setReq(r);
    setOpen(true);
    setMin(false);
    setEv({ event: "dial", data: { phone: r.phone, item: r.itemId ? { id: r.itemId, name: r.itemName } : null }, nonce: Date.now() });
  }, []);

  const app = apps.find((a) => a.installationId === tab);
  const context = useMemo(() => ({ user, workspace, item: req?.itemId ? { id: req.itemId, name: req.itemName } : null, phone: req?.phone }), [user, workspace, req]);

  return (
    <Ctx.Provider value={dial}>
      {children}
      {open && (
        <div className={clsx("card animate-pop fixed bottom-4 right-4 z-[90] w-[360px] overflow-hidden shadow-pop", min && "h-12")}>
          <div className="flex h-12 items-center gap-2 border-b border-border bg-brand px-3 text-white">
            <PhoneCall className="size-4" />
            <span className="flex-1 truncate text-sm font-semibold">
              {req?.itemName ? `${req.itemName} · ` : ""}
              {req?.phone || "Dialer"}
            </span>
            <button onClick={() => setMin((m) => !m)} className="rounded p-1 hover:bg-white/15" aria-label="Minimise">
              <Minus className="size-4" />
            </button>
            <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/15" aria-label="Close dialer">
              <X className="size-4" />
            </button>
          </div>
          {!min && (
            <>
              <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
                {apps.map((a) => (
                  <button key={a.installationId} onClick={() => setTab(a.installationId)} className={clsx("btn btn-sm", tab === a.installationId ? "bg-brand-soft text-brand" : "btn-ghost")}>
                    {a.icon} {a.name}
                  </button>
                ))}
                <button onClick={() => setTab("manual")} className={clsx("btn btn-sm", tab === "manual" ? "bg-brand-soft text-brand" : "btn-ghost")}>
                  ✍️ Log manually
                </button>
              </div>
              {app ? (
                <AppFrame key={app.installationId} installationId={app.installationId} url={app.url} surface="dialer" context={context} hostEvent={ev} height={430} onClose={() => setOpen(false)} onChanged={req?.onLogged} />
              ) : (
                <ManualDialer req={req} />
              )}
            </>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}

function ManualDialer({ req }: { req: DialReq | null }) {
  const toast = useToast();
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [outcome, setOutcome] = useState("Connected");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!start) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [start]);
  const secs = start ? Math.floor((now - start) / 1000) : 0;

  async function log() {
    if (!req?.itemId) return toast("Open the dialer from an item to log the call", "error");
    setBusy(true);
    const r = await api(`/api/items/${req.itemId}/activities`, { method: "POST", json: { type: "call", text: notes, data: { direction: "outbound", outcome, durationSec: secs, phone: req.phone } } });
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    toast("Call logged", "success");
    setStart(null);
    setNotes("");
    req.onLogged?.();
  }

  return (
    <div className="space-y-3 p-4">
      <p className="text-xs text-muted">No dialer app? Call from your phone and log it here. Install a telephony app from the Marketplace to call from the browser.</p>
      <div className="flex items-center gap-3">
        {start ? (
          <button onClick={() => setStart(null)} className="btn btn-danger flex-1">
            <PhoneOff className="size-4" /> End · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
          </button>
        ) : (
          <a href={`tel:${req?.phone || ""}`} onClick={() => setStart(Date.now())} className="btn flex-1 bg-success text-white">
            <Phone className="size-4" /> Call {req?.phone}
          </a>
        )}
      </div>
      <select className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
        {["Connected", "No answer", "Left voicemail", "Busy", "Wrong number"].map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <textarea className="input min-h-[80px]" placeholder="Call notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button onClick={log} disabled={busy} className="btn btn-primary w-full">
        Log call
      </button>
    </div>
  );
}
