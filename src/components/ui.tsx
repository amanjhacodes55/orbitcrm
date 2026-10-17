"use client";
import { useEffect } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

export function Avatar({ name, image, size = 28, className }: { name?: string; image?: string; size?: number; className?: string }) {
  const initials = (name || "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const hue = [...(name || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  if (image)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} className={clsx("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} referrerPolicy="no-referrer" />;
  return (
    <span title={name} className={clsx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)} style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${hue} 60% 52%)` }}>
      {initials}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; wide?: boolean; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh]" onMouseDown={onClose}>
      <div className={clsx("card animate-pop w-full shadow-pop", wide ? "max-w-3xl" : "max-w-lg")} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      {icon && <div className="text-faint">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export function timeAgo(d: string | Date) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 30 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("flex items-center gap-2 font-extrabold tracking-tight", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" className="size-7" />
      <span className="text-[17px]">
        Orbit<span className="text-brand">CRM</span>
      </span>
    </span>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={clsx("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-success" : "bg-surface-3")}>
      <span className={clsx("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}
