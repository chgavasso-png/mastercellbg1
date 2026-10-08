import { useId, useState } from "react";

export type Point = { label: string; value: number; extra?: number };

type Props = {
  data: Point[];
  format?: (v: number) => string;
  height?: number;
  valueLabel?: string;
  extraLabel?: string;
};

export function AreaChart({ data, format = String, height = 220, valueLabel = "Receita", extraLabel }: Props) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const w = 640;
  const h = height;
  const pad = { t: 16, r: 10, b: 10, l: 10 };
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.extra ?? 0))) * 1.15;
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);

  const line = (key: "value" | "extra") =>
    data
      .map((d, i) => {
        const px = x(i);
        const py = y(d[key] ?? 0);
        if (i === 0) return `M${px},${py}`;
        const mid = (x(i - 1) + px) / 2;
        return `C${mid},${y(data[i - 1][key] ?? 0)} ${mid},${py} ${px},${py}`;
      })
      .join(" ");

  const area = `${line("value")} L${x(data.length - 1)},${h - pad.b} L${x(0)},${h - pad.b} Z`;
  const active = hover ?? data.length - 1;
  const hasExtra = data.some((d) => d.extra !== undefined);

  return (
    <div className="chart">
      <div className="chart-plot" style={{ height }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--brand)" stopOpacity="0.5" />
              <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((t) => (
            <line key={t} x1={pad.l} x2={w - pad.r} y1={pad.t + t * (h - pad.t - pad.b)} y2={pad.t + t * (h - pad.t - pad.b)}
              stroke="var(--line)" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill={`url(#${id})`} />
          {hasExtra && (
            <path d={line("extra")} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
          )}
          <path d={line("value")} fill="none" stroke="var(--brand-strong)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <line x1={x(active)} x2={x(active)} y1={0} y2={h} stroke="var(--ink)" strokeOpacity="0.12" vectorEffect="non-scaling-stroke" />
          {data.map((_, i) => (
            <rect key={i} x={x(i) - w / data.length / 2} y={0} width={w / data.length} height={h} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
        <span className="chart-dot" style={{ left: `${(x(active) / w) * 100}%`, top: `${(y(data[active]?.value ?? 0) / h) * 100}%` }} />
      </div>
      <div className="chart-axis">
        {data.map((d, i) => (
          <span key={i} className={i === active ? "on" : ""}>{d.label}</span>
        ))}
      </div>
      {data[active] && (
        <div className="chart-tip">
          <b>{data[active].label}</b>
          <span><i style={{ background: "var(--brand-strong)" }} />{valueLabel} <strong>{format(data[active].value)}</strong></span>
          {extraLabel && hasExtra && (
            <span><i style={{ background: "var(--accent)" }} />{extraLabel} <strong>{format(data[active].extra ?? 0)}</strong></span>
          )}
        </div>
      )}
    </div>
  );
}

export function Bars({ data, format = String }: { data: { label: string; value: number; color?: string }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars">
      {data.map((d) => (
        <div key={d.label} className="bar-row">
          <span className="bar-label">{d.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
          </span>
          <span className="bar-value tabular">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ parts, size = 132 }: { parts: { label: string; value: number; color: string }[]; size?: number }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" aria-hidden>
      <circle cx="66" cy="66" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="16" />
      {parts.map((p) => {
        const len = (p.value / total) * c;
        const offset = acc;
        acc += len;
        return (
          <circle key={p.label} cx="66" cy="66" r={r} fill="none" stroke={p.color} strokeWidth="16"
            strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} transform="rotate(-90 66 66)" />
        );
      })}
    </svg>
  );
}
