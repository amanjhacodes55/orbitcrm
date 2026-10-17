"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";

export type HostEvent = { event: string; data: unknown; nonce: number };

/**
 * Hosts an app page in a sandboxed iframe and implements the Orbit App SDK bridge (see /public/sdk/orbit-app-sdk.js).
 * Data methods are forwarded to /api/installations/:id/bridge, which enforces the app's scopes server-side.
 */
export default function AppFrame({
  installationId,
  url,
  surface,
  context,
  hostEvent,
  height = 420,
  onClose,
  onChanged,
}: {
  installationId: string;
  url: string;
  surface: "dialer" | "settings" | "item_panel";
  context: Record<string, unknown>;
  hostEvent?: HostEvent | null;
  height?: number;
  onClose?: () => void;
  onChanged?: () => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [h, setH] = useState(height);
  const toast = useToast();
  const ctxRef = useRef(context);
  ctxRef.current = context;
  const src = `${url}${url.includes("?") ? "&" : "?"}installation=${installationId}&surface=${surface}`;

  useEffect(() => {
    const onMsg = async (e: MessageEvent) => {
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      const m = e.data as { orbit?: number; id?: number; method?: string; params?: Record<string, unknown> };
      if (!m || m.orbit !== 1 || !m.method) return;
      const reply = (result?: unknown, error?: string) => ref.current?.contentWindow?.postMessage({ orbit: 1, id: m.id, result, error }, "*");
      switch (m.method) {
        case "getContext":
          setReady(true);
          return reply({ ...ctxRef.current, installationId, surface });
        case "toast":
          toast(String(m.params?.text || ""), "info");
          return reply({ ok: true });
        case "resize":
          setH(Math.max(120, Math.min(1200, Number(m.params?.height) || height)));
          return reply({ ok: true });
        case "close":
          onClose?.();
          return reply({ ok: true });
        default: {
          const r = await api<{ result: unknown }>(`/api/installations/${installationId}/bridge`, { method: "POST", json: { method: m.method, params: m.params } });
          if (r.ok && ["updateItem", "logActivity", "fireTrigger", "saveSettings"].includes(m.method)) onChanged?.();
          return reply(r.ok ? r.data.result : undefined, r.ok ? undefined : r.error);
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [installationId, surface, toast, onClose, onChanged, height]);

  useEffect(() => {
    if (ready && hostEvent) ref.current?.contentWindow?.postMessage({ orbit: 1, event: hostEvent.event, data: hostEvent.data }, "*");
  }, [ready, hostEvent]);

  return (
    <iframe
      ref={ref}
      src={src}
      title={`${surface} app`}
      className="w-full rounded-md border-0 bg-white"
      style={{ height: h }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      allow="microphone; autoplay; clipboard-write"
    />
  );
}
