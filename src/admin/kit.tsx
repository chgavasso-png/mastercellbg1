import { useMemo, useState, type ReactNode } from "react";
import { Search, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="a-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </div>
  );
}

export function Kpi({ label, value, hint, icon: Icon, trend, tone }: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  trend?: number;
  tone?: "brand" | "dark";
}) {
  return (
    <div className={`kpi${tone ? ` kpi-${tone}` : ""}`}>
      <div className="row between">
        <span className="kpi-label">{label}</span>
        {Icon && <Icon className="kpi-icon" />}
      </div>
      <strong className="kpi-value tabular">{value}</strong>
      <div className="row kpi-foot">
        {trend !== undefined && Number.isFinite(trend) && (
          <span className={`trend ${trend >= 0 ? "up" : "down"}`}>
            {trend >= 0 ? <TrendingUp /> : <TrendingDown />}
            {Math.abs(trend * 100).toFixed(0)}%
          </span>
        )}
        {hint && <span className="faint">{hint}</span>}
      </div>
    </div>
  );
}

export function Card({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`a-card ${className}`}>
      {(title || actions) && (
        <header className="row between">
          {title && <h3>{title}</h3>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export type Column<T> = {
  key: string;
  label: ReactNode;
  render: (row: T) => ReactNode;
  sort?: (row: T) => number | string;
  align?: "right" | "center";
  width?: string;
};

export function Table<T extends { id: string }>({ rows, columns, onRow, empty = "Nada por aqui ainda." }: {
  rows: T[];
  columns: Column<T>[];
  onRow?: (row: T) => void;
  empty?: ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!col?.sort || !sort) return rows;
    return [...rows].sort((a, b) => (col.sort!(a) > col.sort!(b) ? 1 : -1) * sort.dir);
  }, [rows, sort, columns]);

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ textAlign: c.align, width: c.width }}
                className={c.sort ? "sortable" : ""}
                onClick={() => c.sort && setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))}
              >
                {c.label}
                {sort?.key === c.key && <span className="sort-dir">{sort.dir === 1 ? "↑" : "↓"}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} onClick={onRow && (() => onRow(row))} className={onRow ? "clickable" : ""}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align }}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="empty">{empty}</div>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Buscar…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="a-search">
      <Search />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; count?: number }[] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((i) => (
        <button key={i.id} role="tab" aria-selected={value === i.id} className={value === i.id ? "on" : ""} onClick={() => onChange(i.id)}>
          {i.label}
          {i.count !== undefined && <span>{i.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const matches = (q: string, ...fields: (string | undefined)[]) => {
  const n = q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return !n || fields.some((f) => f?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(n));
};

export const monthsBack = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (n - 1 - i));
    return d;
  });

export const sameMonth = (iso: string, d: Date) => {
  const x = new Date(iso);
  return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear();
};
