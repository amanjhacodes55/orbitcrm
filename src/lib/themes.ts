/** Theme registry — CSS lives in globals.css under [data-theme="…"]. */
export type ThemeDef = { id: string; name: string; mode: "light" | "dark"; tagline: string; swatch: [string, string, string, string] };

export const THEMES: ThemeDef[] = [
  { id: "light", name: "Orbit Light", mode: "light", tagline: "Clean & calm", swatch: ["#f6f7fb", "#ffffff", "#6161ff", "#ff7eb6"] },
  { id: "dark", name: "Orbit Night", mode: "dark", tagline: "Easy on the eyes", swatch: ["#161a33", "#1f2342", "#7b7bff", "#ff8fc4"] },
  { id: "retro", name: "Hedgehog Retro", mode: "light", tagline: "Paper, ink & chunky shadows", swatch: ["#eeefe9", "#fdfdf8", "#f54e00", "#1d1f27"] },
  { id: "sunset", name: "Sunset", mode: "light", tagline: "Warm coral glow", swatch: ["#fff1e6", "#ffffff", "#ff5a5f", "#ffc75f"] },
  { id: "ocean", name: "Ocean", mode: "light", tagline: "Fresh teal breeze", swatch: ["#e3f4fb", "#ffffff", "#0891b2", "#34d399"] },
  { id: "forest", name: "Forest", mode: "light", tagline: "Earthy & grounded", swatch: ["#f2f4ec", "#fffefa", "#2f7d4f", "#d9a441"] },
  { id: "candy", name: "Candy", mode: "light", tagline: "Playful pastels", swatch: ["#fdf2ff", "#ffffff", "#c43df0", "#4cc9f0"] },
  { id: "neon", name: "Neon Midnight", mode: "dark", tagline: "Glowing cyber vibes", swatch: ["#0b0820", "#14102e", "#a855f7", "#22d3ee"] },
];
export const THEME_IDS = THEMES.map((t) => t.id);

export function applyTheme(id: string) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  document.documentElement.dataset.theme = t.id;
  document.documentElement.dataset.mode = t.mode;
  try { localStorage.setItem("orbit-theme", t.id); } catch {}
  window.dispatchEvent(new CustomEvent("orbit:theme", { detail: t.id }));
}
