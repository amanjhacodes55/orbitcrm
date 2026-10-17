/**
 * Orbi — OrbitCRM's mascot: a friendly little planet with a ring.
 * Pure SVG, coloured by theme variables (--brand, --accent, --warn…), so it re-skins with every theme.
 */
import { useId } from "react";

export type Pose = "wave" | "phone" | "search" | "celebrate" | "sleep" | "rocket" | "think" | "mail" | "puzzle" | "zap" | "happy";

const INK = "var(--art-ink)";
const S = { stroke: "var(--art-stroke)", strokeWidth: 3, strokeLinejoin: "round" as const };

export default function Orbi({ pose = "happy", size = 160, className }: { pose?: Pose; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const sleepy = pose === "sleep";
  const excited = pose === "celebrate" || pose === "rocket";
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} className={className} role="img" aria-label={`Orbi the mascot (${pose})`}>
      <defs>
        <radialGradient id={`b${id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="var(--brand-strong)" />
          <stop offset="0.5" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--hero-b)" />
        </radialGradient>
        <clipPath id={`f${id}`}><rect x="0" y="112" width="220" height="120" /></clipPath>
      </defs>
      {/* ground shadow */}
      {pose !== "rocket" && <ellipse cx="110" cy="200" rx="52" ry="7" fill="#000" opacity=".09" />}
      {/* rocket flames */}
      {pose === "rocket" && (
        <g className="animate-twinkle">
          <path d="M92 168 Q110 215 128 168 Z" fill="var(--warn)" />
          <path d="M100 168 Q110 198 120 168 Z" fill="var(--danger)" />
        </g>
      )}
      {/* back ring */}
      <ellipse cx="110" cy="112" rx="94" ry="24" transform="rotate(-14 110 112)" fill="none" stroke="var(--accent)" strokeWidth="9" opacity=".95" />
      {/* arms (behind body) */}
      <g stroke={INK} strokeWidth="7" strokeLinecap="round" fill="none">
        {pose === "wave" || excited ? null : <path d="M58 128 Q44 138 46 152" />}
        {pose === "celebrate" && <path d="M58 112 Q38 92 42 72" />}
      </g>
      {/* body */}
      <circle cx="110" cy="105" r="60" fill={`url(#b${id})`} {...S} />
      <circle cx="88" cy="82" r="16" fill="#fff" opacity=".22" />
      <circle cx="136" cy="128" r="7" fill="#000" opacity=".08" />
      <circle cx="146" cy="96" r="4" fill="#000" opacity=".08" />
      {/* antenna */}
      <path d="M110 46 L110 26" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M110 12 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="var(--warn)" {...S} strokeWidth={2} className={excited ? "animate-twinkle" : undefined} />
      {/* face */}
      {sleepy ? (
        <g stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none"><path d="M83 99 q8 7 16 0" /><path d="M121 99 q8 7 16 0" /></g>
      ) : (
        <g>
          <ellipse cx="91" cy="97" rx="11" ry="13" fill="#fff" {...S} strokeWidth={2} />
          <ellipse cx="129" cy="97" rx="11" ry="13" fill="#fff" {...S} strokeWidth={2} />
          <circle cx={pose === "search" ? 95 : pose === "think" ? 94 : 92} cy={pose === "think" ? 93 : 99} r="6" fill={INK} />
          <circle cx={pose === "search" ? 133 : pose === "think" ? 132 : 130} cy={pose === "think" ? 93 : 99} r="6" fill={INK} />
          <circle cx="89" cy="96" r="2" fill="#fff" />
          <circle cx="127" cy="96" r="2" fill="#fff" />
        </g>
      )}
      <ellipse cx="76" cy="117" rx="8" ry="5" fill="#ff8fb1" opacity=".75" />
      <ellipse cx="144" cy="117" rx="8" ry="5" fill="#ff8fb1" opacity=".75" />
      {excited || pose === "wave" ? (
        <path d="M96 117 Q110 134 124 117 Z" fill={INK} />
      ) : pose === "think" ? (
        <path d="M102 121 h14" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      ) : sleepy ? (
        <ellipse cx="110" cy="121" rx="5" ry="4" fill={INK} />
      ) : (
        <path d="M97 116 Q110 128 123 116" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
      )}
      {/* front ring (over the body) */}
      <g clipPath={`url(#f${id})`}>
        <ellipse cx="110" cy="112" rx="94" ry="24" transform="rotate(-14 110 112)" fill="none" stroke="var(--accent)" strokeWidth="9" />
      </g>
      {/* arms in front + props */}
      <g stroke={INK} strokeWidth="7" strokeLinecap="round" fill="none">
        {pose === "wave" && <g className="animate-wave"><path d="M160 112 Q182 94 180 70" /></g>}
        {(pose === "celebrate" || pose === "rocket") && <path d="M162 112 Q182 92 178 72" />}
        {!["wave", "celebrate", "rocket"].includes(pose) && <path d="M162 128 Q176 138 174 150" />}
        {pose === "wave" && <path d="M58 128 Q44 138 46 152" />}
      </g>
      {pose === "phone" && (
        <g transform="rotate(14 178 140)">
          <rect x="166" y="120" width="24" height="40" rx="5" fill="var(--art-paper)" stroke={INK} strokeWidth="3" />
          <rect x="171" y="127" width="14" height="20" rx="2" fill="var(--accent)" />
          <circle cx="178" cy="153" r="2" fill={INK} />
          <path d="M196 118 q8 8 0 16 M202 112 q14 14 0 28" stroke="var(--success)" strokeWidth="3" fill="none" strokeLinecap="round" className="animate-twinkle" />
        </g>
      )}
      {pose === "search" && (
        <g>
          <circle cx="186" cy="150" r="17" fill="var(--art-paper)" fillOpacity=".55" stroke={INK} strokeWidth="5" />
          <path d="M198 162 l14 14" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        </g>
      )}
      {pose === "mail" && (
        <g transform="rotate(-8 180 150)">
          <rect x="158" y="136" width="44" height="30" rx="4" fill="var(--art-paper)" stroke={INK} strokeWidth="3" />
          <path d="M159 138 L180 154 L201 138" stroke={INK} strokeWidth="3" fill="none" />
          <circle cx="200" cy="136" r="7" fill="var(--danger)" />
        </g>
      )}
      {pose === "puzzle" && (
        <path d="M164 136 h12 a6 6 0 1 1 12 0 h12 v12 a6 6 0 1 0 0 12 v12 h-36z" fill="var(--warn)" stroke={INK} strokeWidth="3" strokeLinejoin="round" transform="rotate(10 182 154)" />
      )}
      {pose === "zap" && <path d="M186 116 L168 152 L182 152 L172 182 L200 140 L186 140 L196 116 Z" fill="var(--warn)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />}
      {pose === "think" && (
        <g fill="var(--art-paper)" stroke={INK} strokeWidth="2.5">
          <circle cx="170" cy="52" r="5" /><circle cx="182" cy="36" r="8" />
          <ellipse cx="200" cy="16" rx="18" ry="12" />
        </g>
      )}
      {pose === "sleep" && (
        <g fill={INK} fontFamily="var(--font-display), sans-serif" fontWeight="800" className="animate-twinkle">
          <text x="160" y="50" fontSize="22">z</text><text x="176" y="34" fontSize="16">z</text><text x="188" y="20" fontSize="12">z</text>
        </g>
      )}
      {pose === "celebrate" && (
        <g className="animate-twinkle">
          {[["#ff7eb6", 26, 40, 20], ["var(--warn)", 190, 40, -30], ["var(--success)", 30, 170, 40], ["var(--accent)", 196, 176, 10], ["var(--brand)", 60, 20, 60], ["#ff7eb6", 170, 14, -10]].map(([c, x, y, r], i) => (
            <rect key={i} x={x as number} y={y as number} width="10" height="5" rx="2" fill={c as string} transform={`rotate(${r} ${x} ${y})`} />
          ))}
        </g>
      )}
    </svg>
  );
}
