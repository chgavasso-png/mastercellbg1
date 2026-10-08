import { Link } from "react-router-dom";
import { ArrowRight, PackageOpen, Receipt, ShoppingBag, Wallet, Wrench } from "lucide-react";
import { Slot } from "@/core/plugins";
import { useCollection } from "@/core/store";
import { db } from "@/domain/db";
import { money, monthName, short, stamp } from "@/core/format";
import { AreaChart, Donut } from "@/ui/Chart";
import { ProductArt } from "@/ui/ProductArt";
import { Status, orderStatus } from "@/ui/status";
import { Card, Kpi, PageHead, monthsBack, sameMonth } from "./kit";

const channelColors: Record<string, string> = {
  site: "var(--brand-strong)",
  loja: "var(--brand)",
  instagram: "#d6408f",
  whatsapp: "#25d366",
};

export function Dashboard() {
  const orders = useCollection(db.orders).filter((o) => o.status !== "cancelado");
  const products = useCollection(db.products);
  const repairs = useCollection(db.repairs);

  const months = monthsBack(6);
  const [prev, current] = months.slice(-2);
  const revenueIn = (d: Date) => orders.filter((o) => sameMonth(o.createdAt, d)).reduce((s, o) => s + o.total, 0);
  const ordersIn = (d: Date) => orders.filter((o) => sameMonth(o.createdAt, d)).length;
  const now = revenueIn(current);
  const before = revenueIn(prev);
  const count = ordersIn(current);

  const series = months.map((m) => {
    const list = orders.filter((o) => sameMonth(o.createdAt, m));
    return {
      label: monthName(m),
      value: list.reduce((s, o) => s + o.total, 0),
      extra: list.reduce((s, o) => s + o.items.reduce((c, i) => c + i.cost * i.qty, 0), 0),
    };
  });

  const channels = Object.entries(
    orders.filter((o) => sameMonth(o.createdAt, current) || sameMonth(o.createdAt, prev))
      .reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.channel]: (acc[o.channel] ?? 0) + o.total }), {}),
  ).map(([label, value]) => ({ label, value, color: channelColors[label] }));
  const channelTotal = channels.reduce((s, c) => s + c.value, 0) || 1;

  const lowStock = products.filter((p) => p.active && p.stock <= 5).sort((a, b) => a.stock - b.stock);
  const openRepairs = repairs.filter((r) => r.status !== "entregue");
  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return (
    <>
      <PageHead title="Visão geral" subtitle="O pulso da loja em tempo real." actions={<Link className="btn primary" to="/admin/vendas">Nova venda <ArrowRight /></Link>} />

      <div className="kpis">
        <Kpi tone="dark" label="Faturamento do mês" value={money(now)} icon={Wallet} trend={before ? now / before - 1 : undefined} hint="vs. mês anterior" />
        <Kpi label="Pedidos no mês" value={count} icon={ShoppingBag} trend={ordersIn(prev) ? count / ordersIn(prev) - 1 : undefined} hint="vs. mês anterior" />
        <Kpi label="Ticket médio" value={money(count ? now / count : 0)} icon={Receipt} />
        <Kpi tone="brand" label="Assistências abertas" value={openRepairs.length} icon={Wrench} hint={`${openRepairs.filter((r) => r.status === "pronto").length} prontas p/ retirada`} />
      </div>

      <div className="a-grid">
        <Card title="Receita x custo · 6 meses" className="span-8">
          <AreaChart data={series} format={money} valueLabel="Receita" extraLabel="Custo" />
        </Card>
        <Card title="Vendas por canal" className="span-4">
          <div className="donut-box">
            <Donut parts={channels} size={150} />
            <div className="donut-center">
              <b>{short(channelTotal)}</b>
              <span className="faint">60 dias</span>
            </div>
          </div>
          <ul className="legend">
            {channels.sort((a, b) => b.value - a.value).map((c) => (
              <li key={c.label}>
                <i style={{ background: c.color }} />
                <span>{c.label}</span>
                <b className="tabular">{Math.round((c.value / channelTotal) * 100)}%</b>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Últimos pedidos" actions={<Link to="/admin/vendas" className="link-arrow">Ver todos <ArrowRight /></Link>} className="span-8">
          <ul className="feed">
            {recent.map((o) => (
              <li key={o.id}>
                <span className="feed-code">{o.code}</span>
                <div>
                  <b>{o.customerName}</b>
                  <span className="faint">{o.items.map((i) => i.name).join(", ")}</span>
                </div>
                <Status map={orderStatus} value={o.status} />
                <span className="faint hide-sm">{stamp(o.createdAt)}</span>
                <b className="tabular">{money(o.total)}</b>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Estoque baixo" actions={<Link to="/admin/vitrine" className="link-arrow">Vitrine <ArrowRight /></Link>} className="span-4">
          {lowStock.length === 0 ? (
            <div className="empty"><PackageOpen /><p>Estoque saudável.</p></div>
          ) : (
            <ul className="stock-list">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <div className="thumb sm" style={{ "--tint": p.color } as React.CSSProperties}>
                    <ProductArt category={p.category} color={p.color} imageUrl={p.imageUrl} />
                  </div>
                  <span>{p.name}</span>
                  <span className={`pill ${p.stock === 0 ? "bad" : "warn"}`}>{p.stock} un.</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Slot name="admin.dashboard.widgets" />
      </div>
    </>
  );
}
