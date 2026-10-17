/** Decorative illustrated scenes built from theme variables. */
import Orbi, { type Pose } from "./Orbi";

export function Sparkles({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden>
      {[[30, 40, 6], [360, 60, 5], [320, 250, 7], [60, 240, 4], [200, 20, 4], [380, 160, 3], [20, 140, 3]].map(([x, y, r], i) => (
        <path key={i} className="animate-twinkle" style={{ animationDelay: `${i * 0.4}s` }} d={`M${x} ${y - r * 2} L${x + r * 0.5} ${y - r * 0.5} L${x + r * 2} ${y} L${x + r * 0.5} ${y + r * 0.5} L${x} ${y + r * 2} L${x - r * 0.5} ${y + r * 0.5} L${x - r * 2} ${y} L${x - r * 0.5} ${y - r * 0.5}Z`} fill={i % 2 ? "var(--accent)" : "var(--warn)"} />
      ))}
    </svg>
  );
}

export function Blob({ className, color = "var(--brand-soft)" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <path fill={color} d="M44.7,-58.6C57.1,-50.6,66.1,-36.8,70.6,-21.6C75,-6.4,74.9,10.2,68.6,23.9C62.3,37.6,49.8,48.4,35.7,56.6C21.6,64.8,5.9,70.4,-10.7,70.9C-27.3,71.4,-44.8,66.7,-55.7,55.4C-66.6,44.1,-70.9,26.2,-71.4,9.1C-71.9,-8,-68.5,-24.3,-59.6,-36.8C-50.6,-49.4,-36,-58.2,-21.4,-64.9C-6.8,-71.5,7.8,-76,22,-73.5C36.1,-71,32.3,-66.6,44.7,-58.6Z" transform="translate(100 100)" />
    </svg>
  );
}

/** Kanban-card + chat + automation collage around Orbi — landing hero. */
export function HeroScene({ className }: { className?: string }) {
  const card = (x: number, y: number, w: number, pill: string, label: string, delay = 0, rot = 0) => (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + 30})`}>
      <g className="animate-float" style={{ animationDelay: `${delay}s` }}>
        <rect x={x} y={y} width={w} height="62" rx="12" fill="var(--surface)" stroke="var(--art-stroke)" strokeWidth="2.5" />
        <rect x={x} y={y} width={w} height="62" rx="12" fill="none" stroke="var(--border)" strokeWidth="1" />
        <rect x={x + 12} y={y + 12} width={w * 0.55} height="8" rx="4" fill="var(--art-ink)" opacity=".75" />
        <rect x={x + 12} y={y + 26} width={w * 0.35} height="6" rx="3" fill="var(--faint)" opacity=".7" />
        <rect x={x + 12} y={y + 40} width="58" height="14" rx="7" fill={pill} />
        <text x={x + 41} y={y + 50.5} fontSize="8.5" fontWeight="700" textAnchor="middle" fill="#fff" fontFamily="var(--font-body), sans-serif">{label}</text>
        <circle cx={x + w - 18} cy={y + 47} r="7" fill="var(--hero-c)" />
      </g>
    </g>
  );
  return (
    <svg viewBox="0 0 520 440" className={className} role="img" aria-label="Orbi surrounded by CRM cards, a chat bubble and an automation">
      <defs>
        <linearGradient id="hs-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--hero-a)" /><stop offset=".55" stopColor="var(--hero-b)" /><stop offset="1" stopColor="var(--hero-c)" /></linearGradient>
      </defs>
      <circle cx="260" cy="225" r="170" fill="url(#hs-g)" opacity=".16" />
      <circle cx="260" cy="225" r="120" fill="url(#hs-g)" opacity=".18" />
      <path d="M120 120 C 180 60, 330 60, 400 120" stroke="var(--faint)" strokeWidth="2" strokeDasharray="5 7" fill="none" />
      <path d="M110 330 C 190 400, 340 400, 420 320" stroke="var(--faint)" strokeWidth="2" strokeDasharray="5 7" fill="none" />
      {card(20, 70, 150, "#00c875", "Qualified", 0, -6)}
      {card(350, 54, 150, "#fdab3d", "Proposal", 1.2, 5)}
      {card(28, 300, 150, "#579bfc", "New lead", 0.6, 4)}
      {/* chat bubble */}
      <g className="animate-float" style={{ animationDelay: "1.8s" }}>
        <path d="M352 292 h132 a14 14 0 0 1 14 14 v40 a14 14 0 0 1 -14 14 h-104 l-18 16 v-16 h-10 a14 14 0 0 1 -14 -14 v-40 a14 14 0 0 1 14 -14z" fill="var(--surface)" stroke="var(--art-stroke)" strokeWidth="2.5" />
        <circle cx="372" cy="318" r="9" fill="#25d366" />
        <rect x="388" y="312" width="86" height="7" rx="3.5" fill="var(--art-ink)" opacity=".7" />
        <rect x="388" y="326" width="60" height="6" rx="3" fill="var(--faint)" opacity=".7" />
        <rect x="372" y="340" width="40" height="8" rx="4" fill="var(--brand-soft)" />
      </g>
      {/* automation node */}
      <g className="animate-float" style={{ animationDelay: ".9s" }}>
        <circle cx="440" cy="205" r="30" fill="var(--warn)" stroke="var(--art-stroke)" strokeWidth="2.5" />
        <path d="M444 186 L430 210 L440 210 L434 226 L452 200 L442 200 L448 186Z" fill="#fff" />
      </g>
      <g className="animate-float" style={{ animationDelay: "2.4s" }}>
        <circle cx="74" cy="214" r="24" fill="var(--success)" stroke="var(--art-stroke)" strokeWidth="2.5" />
        <path d="M65 214 l7 7 12 -14" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <foreignObject x="150" y="105" width="220" height="220"><Orbi pose="wave" size={220} /></foreignObject>
      <Sparkles />
    </svg>
  );
}

/** Mascot on a soft blob — used for empty states, auth panels and banners. */
export function Spot({ pose, size = 150, className }: { pose: Pose; size?: number; className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className || ""}`} style={{ width: size * 1.25, height: size * 1.1 }}>
      <Blob className="absolute inset-0 size-full" />
      <Sparkles className="absolute inset-0 size-full" />
      <Orbi pose={pose} size={size} className="relative" />
    </div>
  );
}
