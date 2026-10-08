import type { Category } from "@/domain/types";

type Props = { category: Category; color: string; imageUrl?: string; name?: string; className?: string };

const shade = (hex: string, t: number) => {
  const n = hex.replace("#", "");
  const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const rgb = full.match(/\w\w/g)!.map((v) => parseInt(v, 16));
  return `rgb(${rgb.map((v) => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t)).join(" ")})`;
};

function Phone({ color }: { color: string }) {
  return (
    <g>
      <rect x="62" y="18" width="76" height="164" rx="18" fill={shade(color, -0.25)} />
      <rect x="65" y="21" width="70" height="158" rx="15" fill={shade(color, 0.05)} />
      <rect x="70" y="26" width="60" height="148" rx="11" fill="#0b1033" />
      <rect x="70" y="26" width="60" height="148" rx="11" fill="url(#glare)" />
      <rect x="90" y="31" width="20" height="6" rx="3" fill="#000" />
      <path d="M78 110 l14 0 l6 -14 l7 26 l6 -16 l4 4 l12 0" stroke="var(--brand)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Case({ color }: { color: string }) {
  return (
    <g>
      <rect x="60" y="16" width="80" height="168" rx="20" fill={shade(color, -0.12)} />
      <rect x="64" y="20" width="72" height="160" rx="17" fill={color} />
      <rect x="64" y="20" width="72" height="160" rx="17" fill="url(#sheen)" />
      <rect x="72" y="30" width="34" height="34" rx="10" fill={shade(color, -0.2)} />
      <circle cx="82" cy="40" r="6" fill="#141833" stroke={shade(color, 0.3)} strokeWidth="2" />
      <circle cx="96" cy="54" r="6" fill="#141833" stroke={shade(color, 0.3)} strokeWidth="2" />
      <circle cx="100" cy="112" r="22" fill="none" stroke={shade(color, 0.35)} strokeWidth="2.5" opacity="0.7" />
    </g>
  );
}

function Film({ color }: { color: string }) {
  return (
    <g>
      <rect x="70" y="22" width="70" height="156" rx="16" fill={shade(color, 0.15)} opacity="0.5" transform="rotate(8 105 100)" />
      <rect x="60" y="22" width="70" height="156" rx="16" fill="#cfe3ef" opacity="0.85" />
      <path d="M68 40 L110 22 L122 22 L68 70 Z" fill="#fff" opacity="0.7" />
      <path d="M68 92 L130 48 L130 62 L68 108 Z" fill="#fff" opacity="0.45" />
    </g>
  );
}

function Charger({ color }: { color: string }) {
  return (
    <g>
      <path d="M100 112 C 100 150, 60 140, 60 178" stroke={shade(color, -0.35)} strokeWidth="7" fill="none" strokeLinecap="round" />
      <rect x="70" y="40" width="60" height="74" rx="14" fill={shade(color, -0.1)} />
      <rect x="73" y="43" width="54" height="68" rx="12" fill={color} />
      <rect x="86" y="24" width="8" height="20" rx="2" fill="#9aa0b8" />
      <rect x="106" y="24" width="8" height="20" rx="2" fill="#9aa0b8" />
      <path d="M103 62 l-10 16 h9 l-4 14 l12 -18 h-9 z" fill="var(--brand)" stroke="#0b1033" strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  );
}

function Buds({ color }: { color: string }) {
  return (
    <g>
      <rect x="52" y="78" width="96" height="78" rx="38" fill={shade(color, -0.12)} />
      <rect x="55" y="81" width="90" height="72" rx="35" fill={color} />
      <path d="M55 112 h90" stroke={shade(color, -0.2)} strokeWidth="2" />
      <ellipse cx="80" cy="56" rx="15" ry="18" fill={shade(color, 0.25)} />
      <rect x="76" y="58" width="8" height="34" rx="4" fill={shade(color, 0.25)} />
      <ellipse cx="120" cy="56" rx="15" ry="18" fill={shade(color, 0.25)} />
      <rect x="116" y="58" width="8" height="34" rx="4" fill={shade(color, 0.25)} />
      <circle cx="100" cy="126" r="3" fill="var(--brand)" />
    </g>
  );
}

function Strap({ color }: { color: string }) {
  return (
    <g>
      <path d="M100 30 C 40 40, 40 150, 100 170 C 160 150, 160 40, 100 30" stroke={shade(color, -0.25)} strokeWidth="3" fill="none" strokeDasharray="1 11" strokeLinecap="round" />
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        return <circle key={i} cx={100 + Math.cos(a) * 46} cy={100 + Math.sin(a) * 66} r="7" fill={i % 3 ? color : shade(color, 0.4)} stroke={shade(color, -0.2)} />;
      })}
      <rect x="88" y="150" width="24" height="30" rx="6" fill="#c8b07a" />
    </g>
  );
}

const drawings: Record<Category, (p: { color: string }) => React.ReactNode> = {
  celulares: Phone,
  capinhas: Case,
  peliculas: Film,
  carregadores: Charger,
  fones: Buds,
  acessorios: Strap,
};

export function ProductArt({ category, color, imageUrl, name, className }: Props) {
  if (imageUrl) return <img className={className} src={imageUrl} alt={name ?? ""} loading="lazy" />;
  const Draw = drawings[category] ?? Case;
  return (
    <svg className={className} viewBox="0 0 200 200" role="img" aria-label={name}>
      <defs>
        <linearGradient id="glare" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="190" rx="52" ry="6" fill="#0b1033" opacity="0.12" />
      <Draw color={color} />
    </svg>
  );
}
