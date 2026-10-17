"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Palette } from "lucide-react";
import { THEMES, applyTheme } from "@/lib/themes";

function ThemeCard({ id, active, onPick }: { id: string; active: boolean; onPick: () => void }) {
  const t = THEMES.find((x) => x.id === id)!;
  const [bg, surface, brand, accent] = t.swatch;
  const retro = id === "retro";
  const radius = id === "candy" ? 14 : retro ? 5 : 9;
  return (
    <button onClick={onPick} className={clsx("group rounded-xl p-1.5 text-left transition-transform hover:-translate-y-0.5", active ? "ring-2 ring-brand" : "ring-1 ring-border")}>
      {/* mini app preview */}
      <div className="relative h-20 overflow-hidden rounded-lg" style={{ background: bg }}>
        <div className="absolute inset-y-0 left-0 w-6" style={{ background: surface, borderRight: retro ? "1.5px solid #1d1f27" : "none" }}>
          {[10, 20, 30].map((y) => <div key={y} className="mx-1.5 h-1.5 rounded-full" style={{ marginTop: y === 10 ? 10 : 5, background: y === 10 ? brand : t.mode === "dark" ? "#ffffff30" : "#00000018" }} />)}
        </div>
        <div className="absolute left-9 right-2 top-2.5 p-2" style={{ background: surface, borderRadius: radius, border: retro ? "1.5px solid #1d1f27" : "none", boxShadow: retro ? "2px 2px 0 #1d1f27" : "0 2px 6px #0000001a" }}>
          <div className="h-1.5 w-12 rounded-full" style={{ background: t.mode === "dark" ? "#ffffff60" : "#00000040" }} />
          <div className="mt-1.5 flex gap-1">
            <span className="h-2.5 w-7" style={{ background: brand, borderRadius: radius }} />
            <span className="h-2.5 w-5" style={{ background: accent, borderRadius: radius }} />
          </div>
        </div>
        <div className="absolute bottom-2 left-9 h-3 w-14" style={{ background: brand, borderRadius: id === "candy" ? 99 : radius - 2, border: retro ? "1.5px solid #1d1f27" : "none" }} />
        {active && <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-white"><Check className="size-3" /></span>}
      </div>
      <p className="mt-1.5 px-1 text-xs font-semibold">{t.name}</p>
      <p className="px-1 text-[10px] text-muted">{t.tagline}</p>
    </button>
  );
}

export function ThemeGrid({ onPicked }: { onPicked?: (id: string) => void }) {
  const [cur, setCur] = useState("light");
  useEffect(() => {
    setCur(document.documentElement.dataset.theme || "light");
    const f = (e: Event) => setCur((e as CustomEvent).detail);
    window.addEventListener("orbit:theme", f);
    return () => window.removeEventListener("orbit:theme", f);
  }, []);
  const pick = (id: string) => {
    applyTheme(id);
    setCur(id);
    fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: id }) }).catch(() => {});
    onPicked?.(id);
  };
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {THEMES.map((t) => <ThemeCard key={t.id} id={t.id} active={cur === t.id} onPick={() => pick(t.id)} />)}
    </div>
  );
}

/** Top-bar button + popover. */
export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const c = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", c);
    return () => document.removeEventListener("mousedown", c);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="btn btn-ghost btn-sm !p-2" aria-label="Change theme" title="Themes">
        <Palette className="size-4" />
      </button>
      {open && (
        <div className="card animate-pop absolute right-0 top-10 z-50 w-[min(560px,calc(100vw-1.5rem))] p-4 shadow-pop">
          <p className="font-display text-base font-bold">Pick a vibe ✨</p>
          <p className="mb-3 text-xs text-muted">Themes change colours, fonts, corners and shadows — and Orbi changes outfits too. Saved to your account.</p>
          <ThemeGrid />
        </div>
      )}
    </div>
  );
}

/** Applies the user's saved theme on login (if this browser has none yet). */
export function ThemeSync({ theme }: { theme: string }) {
  useEffect(() => {
    if (!theme) return;
    let local = "";
    try { local = localStorage.getItem("orbit-theme") || ""; } catch {}
    if (local !== theme) applyTheme(theme);
  }, [theme]);
  return null;
}
