import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, FileSpreadsheet, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { definePlugin } from "@/core/plugins";
import { useCollection } from "@/core/store";
import { db } from "@/domain/db";
import type { Expense, Income, Payment } from "@/domain/types";
import { day, money, monthName, percent } from "@/core/format";
import { Card, Kpi, PageHead, SearchBox, Table, Tabs, matches, monthsBack, type Column } from "@/admin/kit";
import { AreaChart, Bars } from "@/ui/Chart";
import { Modal } from "@/ui/Modal";
import { toast } from "@/ui/Toast";
import { expenseLabel, incomeLabel, monthReport, monthTitle, paymentLabel, type Source } from "./data";

function useSource(): Source {
  return {
    orders: useCollection(db.orders),
    repairs: useCollection(db.repairs),
    expenses: useCollection(db.expenses),
    incomes: useCollection(db.incomes),
  };
}

const sameMonthKey = (a: Date, b: Date) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

/** Uma linha do extrato: vendas e consertos vêm automáticos; receitas avulsas e despesas são editáveis. */
type Entry = {
  id: string;
  date: string;
  kind: "venda" | "servico" | "receita" | "despesa";
  description: string;
  category: string;
  amount: number;
  to?: string;
};

const kindLabel: Record<Entry["kind"], string> = { venda: "Venda", servico: "Assistência", receita: "Receita avulsa", despesa: "Despesa" };

type Draft =
  | { type: "receita"; id?: string; description: string; category: Income["category"]; amount: number; date: string; payment?: Payment }
  | { type: "despesa"; id?: string; description: string; category: Expense["category"]; amount: number; date: string };

const today = () => new Date().toISOString();

function Finance() {
  const source = useSource();
  const [range, setRange] = useState<"3" | "6" | "12">("6");
  const months = useMemo(() => monthsBack(12), []);
  const [selected, setSelected] = useState(() => monthKey(months[months.length - 1]));
  const month = months.find((m) => monthKey(m) === selected) ?? months[months.length - 1];
  const report = monthReport(month, source);
  const history = monthsBack(+range).map((m) => monthReport(m, source));
  const t = report.totals;

  const [tab, setTab] = useState<"todos" | "entradas" | "saidas">("todos");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [exporting, setExporting] = useState(false);

  const entries: Entry[] = [
    ...report.sales.map((o) => ({ id: `o-${o.id}`, date: o.createdAt, kind: "venda" as const, description: `Pedido ${o.code} · ${o.customerName}`, category: paymentLabel[o.payment], amount: o.total, to: "/admin/vendas" })),
    ...report.services.map((r) => ({ id: `r-${r.id}`, date: r.createdAt, kind: "servico" as const, description: `${r.protocol} · ${r.device} (${r.customerName})`, category: r.issue, amount: r.quote ?? 0, to: "/admin/assistencia" })),
    ...report.incomes.map((i) => ({ id: i.id, date: i.date, kind: "receita" as const, description: i.description, category: incomeLabel[i.category], amount: i.amount })),
    ...report.expenses.map((e) => ({ id: e.id, date: e.date, kind: "despesa" as const, description: e.description, category: expenseLabel[e.category], amount: -e.amount })),
  ]
    .filter((e) => (tab === "entradas" ? e.amount >= 0 : tab === "saidas" ? e.amount < 0 : true) && matches(q, e.description, e.category))
    .sort((a, b) => b.date.localeCompare(a.date));

  const edit = (e: Entry) => {
    if (e.kind === "receita") {
      const i = db.incomes.get(e.id);
      if (i) setDraft({ type: "receita", id: i.id, description: i.description, category: i.category, amount: i.amount, date: i.date, payment: i.payment });
    } else if (e.kind === "despesa") {
      const x = db.expenses.get(e.id);
      if (x) setDraft({ type: "despesa", id: x.id, description: x.description, category: x.category, amount: x.amount, date: x.date });
    }
  };

  const remove = (kind: "receita" | "despesa", id: string, description: string) => {
    if (!confirm(`Excluir o lançamento “${description}”? Isso não pode ser desfeito.`)) return false;
    (kind === "receita" ? db.incomes : db.expenses).remove(id);
    toast("Lançamento excluído");
    return true;
  };

  const save = () => {
    if (!draft) return;
    if (!draft.description.trim() || !(draft.amount > 0)) return toast("Preencha descrição e um valor maior que zero");
    const { type, id, ...data } = draft;
    const clean = { ...data, description: data.description.trim() };
    if (type === "receita") {
      if (id) db.incomes.update(id, clean as Partial<Income>);
      else db.incomes.insert(clean as Omit<Income, "id" | "createdAt">);
    } else {
      if (id) db.expenses.update(id, clean as Partial<Expense>);
      else db.expenses.insert(clean as Omit<Expense, "id" | "createdAt">);
    }
    toast(id ? "Lançamento atualizado" : type === "receita" ? "Receita lançada" : "Despesa lançada");
    setDraft(null);
  };

  const columns: Column<Entry>[] = [
    { key: "date", label: "Data", sort: (e) => e.date, render: (e) => <span className="muted">{day(e.date)}</span> },
    {
      key: "desc",
      label: "Lançamento",
      render: (e) => (
        <div className="cell-main" style={{ minWidth: 220 }}>
          <span className={`entry-icon ${e.amount >= 0 ? "in" : "out"}`}>{e.amount >= 0 ? <ArrowUpRight /> : <ArrowDownRight />}</span>
          <div><b>{e.description}</b><span className="faint">{kindLabel[e.kind]} · {e.category}</span></div>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Valor",
      align: "right",
      sort: (e) => e.amount,
      render: (e) => <b className="tabular" style={{ color: e.amount >= 0 ? "var(--ok)" : "var(--bad)" }}>{e.amount >= 0 ? "+" : "−"} {money(Math.abs(e.amount))}</b>,
    },
    {
      key: "x",
      label: "",
      align: "right",
      render: (e) =>
        e.to ? (
          <Link to={e.to} className="link-arrow" onClick={(ev) => ev.stopPropagation()}>Ver <ArrowRight /></Link>
        ) : (
          <div className="row" style={{ gap: 2, justifyContent: "flex-end" }}>
            <button className="icon-btn" onClick={(ev) => { ev.stopPropagation(); edit(e); }} aria-label="Editar"><Pencil /></button>
            <button className="icon-btn" onClick={(ev) => { ev.stopPropagation(); remove(e.kind as "receita" | "despesa", e.id, e.description); }} aria-label="Excluir"><Trash2 /></button>
          </div>
        ),
    },
  ];

  const download = async () => {
    setExporting(true);
    try {
      const { downloadMonthExcel } = await import("./excel");
      await downloadMonthExcel(report);
      toast(`Planilha de ${monthTitle(month)} baixada`);
    } catch (e) {
      toast(`Não foi possível gerar a planilha — ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHead
        title="Faturamento"
        subtitle="Receitas, custos, despesas e lucro — tudo editável e exportável."
        actions={
          <>
            <select className="input month-pick" value={selected} onChange={(e) => setSelected(e.target.value)} aria-label="Mês">
              {[...months].reverse().map((m) => <option key={monthKey(m)} value={monthKey(m)}>{monthTitle(m)}</option>)}
            </select>
            <button className="btn ghost" onClick={download} disabled={exporting}><FileSpreadsheet />{exporting ? "Gerando…" : "Baixar Excel"}</button>
            <button className="btn soft" onClick={() => setDraft({ type: "receita", description: "", category: "servico", amount: 0, date: today(), payment: "pix" })}><Plus />Receita</button>
            <button className="btn primary" onClick={() => setDraft({ type: "despesa", description: "", category: "outros", amount: 0, date: today() })}><Plus />Despesa</button>
          </>
        }
      />

      <div className="kpis">
        <Kpi tone="dark" label={`Faturamento · ${monthTitle(month)}`} value={money(t.revenue)} hint={`vendas ${money(t.salesTotal)} · assistência ${money(t.servicesTotal)}${t.incomesTotal ? ` · avulsas ${money(t.incomesTotal)}` : ""}`} />
        <Kpi label="Custo das mercadorias" value={money(t.cogs)} hint={`${t.orders} pedido${t.orders === 1 ? "" : "s"}`} />
        <Kpi label="Despesas" value={money(t.spent)} hint={`${report.expenses.length} lançamento${report.expenses.length === 1 ? "" : "s"}`} />
        <Kpi tone="brand" label="Lucro líquido" value={money(t.profit)} hint={`margem ${percent(t.margin)}`} />
      </div>

      <div className="a-grid">
        <Card
          title="Receita x saídas"
          className="span-8"
          actions={<Tabs value={range} onChange={setRange} items={[{ id: "3", label: "3m" }, { id: "6", label: "6m" }, { id: "12", label: "12m" }]} />}
        >
          <AreaChart
            data={history.map((h) => ({ label: monthName(h.month), value: h.totals.revenue, extra: h.totals.cogs + h.totals.spent }))}
            format={money}
            valueLabel="Receita"
            extraLabel="Saídas"
          />
        </Card>
        <Card title={`Pagamentos · ${monthName(month)}`} className="span-4">
          {report.byPayment.length ? <Bars data={report.byPayment} format={money} /> : <p className="faint">Sem vendas no mês.</p>}
          <hr className="sep" />
          <h3 style={{ marginBottom: 14 }}>Por categoria</h3>
          {report.byCategory.length ? <Bars data={report.byCategory} format={money} /> : <p className="faint">Sem vendas no mês.</p>}
        </Card>

        <Card
          title={`Lançamentos · ${monthTitle(month)}`}
          className="flush"
          actions={
            <div className="row wrap" style={{ gap: 8 }}>
              <SearchBox value={q} onChange={setQ} placeholder="Buscar lançamento" />
              <Tabs value={tab} onChange={setTab} items={[{ id: "todos", label: "Todos" }, { id: "entradas", label: "Entradas" }, { id: "saidas", label: "Saídas" }]} />
            </div>
          }
        >
          <Table rows={entries} columns={columns} onRow={(e) => (e.to ? undefined : edit(e))} empty="Nenhum lançamento neste mês." />
        </Card>

        <Card title="DRE por mês" className="flush">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th style={{ textAlign: "right" }}>Receita</th>
                  <th style={{ textAlign: "right" }}>Mercadoria</th>
                  <th style={{ textAlign: "right" }}>Despesas</th>
                  <th style={{ textAlign: "right" }}>Lucro</th>
                  <th style={{ textAlign: "right" }}>Margem</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h) => (
                  <tr key={monthKey(h.month)} className={sameMonthKey(h.month, month) ? "selected" : ""} onClick={() => setSelected(monthKey(h.month))} style={{ cursor: "pointer" }}>
                    <td><b>{monthTitle(h.month)}</b></td>
                    <td className="tabular" style={{ textAlign: "right" }}>{money(h.totals.revenue)}</td>
                    <td className="tabular muted" style={{ textAlign: "right" }}>{money(h.totals.cogs)}</td>
                    <td className="tabular muted" style={{ textAlign: "right" }}>{money(h.totals.spent)}</td>
                    <td className="tabular" style={{ textAlign: "right", color: h.totals.profit >= 0 ? "var(--ok)" : "var(--bad)", fontWeight: 700 }}>{money(h.totals.profit)}</td>
                    <td className="tabular muted" style={{ textAlign: "right" }}>{percent(h.totals.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {draft && (
        <Modal
          title={`${draft.id ? "Editar" : "Lançar"} ${draft.type === "receita" ? "receita" : "despesa"}`}
          onClose={() => setDraft(null)}
          footer={
            <>
              {draft.id && (
                <button className="btn danger" onClick={() => remove(draft.type, draft.id!, draft.description) && setDraft(null)}><Trash2 />Excluir</button>
              )}
              <span style={{ flex: 1 }} />
              <button className="btn ghost" onClick={() => setDraft(null)}>Cancelar</button>
              <button className="btn primary" onClick={save}>Salvar</button>
            </>
          }
        >
          {!draft.id && (
            <Tabs
              value={draft.type}
              onChange={(type) =>
                setDraft(type === "receita"
                  ? { type, description: draft.description, category: "servico", amount: draft.amount, date: draft.date, payment: "pix" }
                  : { type, description: draft.description, category: "outros", amount: draft.amount, date: draft.date })
              }
              items={[{ id: "receita" as const, label: "Receita (entrada)" }, { id: "despesa" as const, label: "Despesa (saída)" }]}
            />
          )}
          <div className="grid-2" style={{ marginTop: 14 }}>
            <label className="field span-2">
              <span>Descrição</span>
              <input autoFocus value={draft.description} placeholder={draft.type === "receita" ? "Ex.: Troca de tela no balcão" : "Ex.: Conta de luz"} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <label className="field">
              <span>Categoria</span>
              {draft.type === "receita" ? (
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Income["category"] })}>
                  {Object.entries(incomeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : (
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Expense["category"] })}>
                  {Object.entries(expenseLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              )}
            </label>
            <label className="field"><span>Valor (R$)</span><input type="number" min="0" step="0.01" inputMode="decimal" value={draft.amount || ""} onChange={(e) => setDraft({ ...draft, amount: +e.target.value })} /></label>
            <label className="field"><span>Data</span><input type="date" value={draft.date.slice(0, 10)} onChange={(e) => e.target.value && setDraft({ ...draft, date: new Date(`${e.target.value}T12:00`).toISOString() })} /></label>
            {draft.type === "receita" && (
              <label className="field">
                <span>Forma de pagamento</span>
                <select value={draft.payment ?? ""} onChange={(e) => setDraft({ ...draft, payment: (e.target.value || undefined) as Payment | undefined })}>
                  {Object.entries(paymentLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
            )}
          </div>
          <p className="faint" style={{ marginTop: 12 }}>
            Vendas e consertos entram sozinhos. Para mudar ou excluir, use <Link to="/admin/vendas">Vendas</Link> ou <Link to="/admin/assistencia">Assistência</Link>.
          </p>
        </Modal>
      )}
    </>
  );
}

function ProfitWidget() {
  const source = useSource();
  const [prev, now] = monthsBack(2).map((m) => monthReport(m, source).totals);
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
