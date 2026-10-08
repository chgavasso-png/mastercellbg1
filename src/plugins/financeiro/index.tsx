import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Download, Plus, Trash2, Wallet } from "lucide-react";
import { definePlugin } from "@/core/plugins";
import { useCollection } from "@/core/store";
import { db } from "@/domain/db";
import type { Expense } from "@/domain/types";
import { day, money, monthName, percent } from "@/core/format";
import { Card, Kpi, PageHead, Table, Tabs, monthsBack, sameMonth, type Column } from "@/admin/kit";
import { AreaChart, Bars } from "@/ui/Chart";
import { Modal } from "@/ui/Modal";
import { toast } from "@/ui/Toast";

const expenseLabel: Record<Expense["category"], string> = {
  aluguel: "Aluguel",
  marketing: "Marketing",
  pessoal: "Pessoal",
  frete: "Frete",
  taxas: "Taxas",
  outros: "Outros",
};

function useFinance(range: number) {
  const orders = useCollection(db.orders).filter((o) => o.status !== "cancelado");
  const expenses = useCollection(db.expenses);
  const repairs = useCollection(db.repairs);
  const months = monthsBack(range);

  const rows = months.map((m) => {
    const sales = orders.filter((o) => sameMonth(o.createdAt, m));
    const revenue = sales.reduce((s, o) => s + o.total, 0);
    const services = repairs.filter((r) => r.quote && ["pronto", "entregue"].includes(r.status) && sameMonth(r.createdAt, m)).reduce((s, r) => s + (r.quote ?? 0), 0);
    const cogs = sales.reduce((s, o) => s + o.items.reduce((c, i) => c + i.cost * i.qty, 0), 0);
    const spent = expenses.filter((e) => sameMonth(e.date, m)).reduce((s, e) => s + e.amount, 0);
    return { month: m, revenue: revenue + services, services, cogs, spent, profit: revenue + services - cogs - spent, orders: sales.length };
  });

  const sum = (k: keyof (typeof rows)[0]) => rows.reduce((s, r) => s + (r[k] as number), 0);
  return { rows, orders, expenses, total: { revenue: sum("revenue"), cogs: sum("cogs"), spent: sum("spent"), profit: sum("profit"), services: sum("services"), orders: sum("orders") } };
}

function Finance() {
  const [range, setRange] = useState<"3" | "6">("6");
  const { rows, orders, expenses, total } = useFinance(+range);
  const [adding, setAdding] = useState<Omit<Expense, "id" | "createdAt"> | null>(null);
  const margin = total.revenue ? total.profit / total.revenue : 0;

  const byCategory = Object.entries(
    orders
      .filter((o) => rows.some((r) => sameMonth(o.createdAt, r.month)))
      .flatMap((o) => o.items)
      .reduce<Record<string, number>>((acc, i) => {
        const cat = db.products.get(i.productId)?.category ?? "outros";
        return { ...acc, [cat]: (acc[cat] ?? 0) + i.price * i.qty };
      }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const byPayment = (["pix", "cartao", "boleto", "brasilcard", "dinheiro"] as const).map((p) => ({
    label: { pix: "Pix", cartao: "Cartão", boleto: "Boleto", brasilcard: "Brasilcard", dinheiro: "Dinheiro" }[p],
    value: orders.filter((o) => o.payment === p && rows.some((r) => sameMonth(o.createdAt, r.month))).reduce((s, o) => s + o.total, 0),
    color: { pix: "var(--brand-strong)", cartao: "var(--accent)", boleto: "var(--ok)", brasilcard: "var(--ink-3)", dinheiro: "var(--brand)" }[p],
  }));

  const columns: Column<Expense>[] = [
    { key: "desc", label: "Despesa", render: (e) => <b>{e.description}</b> },
    { key: "cat", label: "Categoria", render: (e) => <span className="pill plain">{expenseLabel[e.category]}</span> },
    { key: "date", label: "Data", sort: (e) => e.date, render: (e) => <span className="muted">{day(e.date)}</span> },
    { key: "amount", label: "Valor", align: "right", sort: (e) => e.amount, render: (e) => <b className="tabular">{money(e.amount)}</b> },
    { key: "x", label: "", align: "right", render: (e) => <button className="icon-btn" onClick={() => db.expenses.remove(e.id)} aria-label="Excluir"><Trash2 /></button> },
  ];

  const exportCsv = () => {
    const head = "mes;receita;servicos;custo_mercadoria;despesas;lucro;pedidos";
    const body = rows.map((r) => [monthName(r.month), r.revenue, r.services, r.cogs, r.spent, r.profit, r.orders].map((v) => (typeof v === "number" ? v.toFixed(2).replace(".", ",") : v)).join(";"));
    const blob = new Blob([[head, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `faturamento-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <>
      <PageHead
        title="Faturamento"
        subtitle="Receita, custos e lucro da operação."
        actions={
          <>
            <Tabs value={range} onChange={setRange} items={[{ id: "3", label: "3 meses" }, { id: "6", label: "6 meses" }]} />
            <button className="btn ghost" onClick={exportCsv}><Download />Exportar</button>
            <button className="btn primary" onClick={() => setAdding({ description: "", category: "outros", amount: 0, date: new Date().toISOString() })}><Plus />Despesa</button>
          </>
        }
      />

      <div className="kpis">
        <Kpi tone="dark" label="Faturamento bruto" value={money(total.revenue)} hint={`${total.orders} pedidos`} />
        <Kpi label="Custo das mercadorias" value={money(total.cogs)} />
        <Kpi label="Despesas" value={money(total.spent)} />
        <Kpi tone="brand" label="Lucro líquido" value={money(total.profit)} hint={`margem ${percent(margin)}`} />
      </div>

      <div className="a-grid">
        <Card title="Receita x despesas totais" className="span-8">
          <AreaChart
            data={rows.map((r) => ({ label: monthName(r.month), value: r.revenue, extra: r.cogs + r.spent }))}
            format={money}
            valueLabel="Receita"
            extraLabel="Saídas"
          />
        </Card>
        <Card title="Por forma de pagamento" className="span-4">
          <Bars data={byPayment} format={money} />
          <hr className="sep" />
          <h3 style={{ marginBottom: 14 }}>Por categoria</h3>
          <Bars data={byCategory} format={money} />
        </Card>

        <Card title="DRE simplificado" className="span-6 flush">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Mês</th><th style={{ textAlign: "right" }}>Receita</th><th style={{ textAlign: "right" }}>Saídas</th><th style={{ textAlign: "right" }}>Lucro</th></tr></thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.month.toISOString()}>
                    <td style={{ textTransform: "capitalize" }}><b>{monthName(r.month)}</b></td>
                    <td className="tabular" style={{ textAlign: "right" }}>{money(r.revenue)}</td>
                    <td className="tabular muted" style={{ textAlign: "right" }}>{money(r.cogs + r.spent)}</td>
                    <td className="tabular" style={{ textAlign: "right", color: r.profit >= 0 ? "var(--ok)" : "var(--bad)", fontWeight: 700 }}>{money(r.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Despesas lançadas" className="span-6 flush">
          <Table rows={[...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)} columns={columns} />
        </Card>
      </div>

      {adding && (
        <Modal
          title="Lançar despesa"
          onClose={() => setAdding(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setAdding(null)}>Cancelar</button>
              <button className="btn primary" onClick={() => {
                if (!adding.description || adding.amount <= 0) return toast("Preencha descrição e valor");
                db.expenses.insert(adding);
                setAdding(null);
                toast("Despesa lançada");
              }}>Salvar</button>
            </>
          }
        >
          <div className="grid-2">
            <label className="field span-2"><span>Descrição</span><input autoFocus value={adding.description} onChange={(e) => setAdding({ ...adding, description: e.target.value })} /></label>
            <label className="field">
              <span>Categoria</span>
              <select value={adding.category} onChange={(e) => setAdding({ ...adding, category: e.target.value as Expense["category"] })}>
                {Object.entries(expenseLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="field"><span>Valor</span><input type="number" min="0" step="0.01" value={adding.amount} onChange={(e) => setAdding({ ...adding, amount: +e.target.value })} /></label>
            <label className="field span-2"><span>Data</span><input type="date" value={adding.date.slice(0, 10)} onChange={(e) => setAdding({ ...adding, date: new Date(`${e.target.value}T12:00`).toISOString() })} /></label>
          </div>
        </Modal>
      )}
    </>
  );
}

function ProfitWidget() {
  const { rows } = useFinance(2);
  const [prev, now] = rows;
  return (
    <Card title="Lucro do mês" actions={<Link to="/admin/faturamento" className="link-arrow">Detalhes <ArrowRight /></Link>} className="span-4">
      <strong className="kpi-value tabular">{money(now.profit)}</strong>
      <p className="faint" style={{ marginTop: 8 }}>Mês anterior: {money(prev.profit)}</p>
      <div className="profit-split">
        <span style={{ flex: Math.max(now.cogs, 1) }} title="Mercadoria" />
        <span style={{ flex: Math.max(now.spent, 1) }} title="Despesas" />
        <span style={{ flex: Math.max(now.profit, 1) }} title="Lucro" />
      </div>
      <ul className="legend">
        <li><i style={{ background: "var(--accent)" }} /><span>Mercadoria</span><b className="tabular">{money(now.cogs)}</b></li>
        <li><i style={{ background: "var(--ink-3)" }} /><span>Despesas</span><b className="tabular">{money(now.spent)}</b></li>
        <li><i style={{ background: "var(--brand)" }} /><span>Lucro</span><b className="tabular">{money(now.profit)}</b></li>
      </ul>
    </Card>
  );
}

export default definePlugin({
  id: "financeiro",
  name: "Faturamento",
  admin: [{ path: "faturamento", label: "Faturamento", icon: Wallet, group: "Financeiro", order: 40, element: <Finance /> }],
  slots: { "admin.dashboard.widgets": [ProfitWidget] },
});
