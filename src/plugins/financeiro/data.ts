import { db } from "@/domain/db";
import type { Expense, Income, Order, Payment, Repair } from "@/domain/types";
import { sameMonth } from "@/admin/kit";

export const expenseLabel: Record<Expense["category"], string> = {
  aluguel: "Aluguel",
  marketing: "Marketing",
  pessoal: "Pessoal",
  frete: "Frete",
  taxas: "Taxas",
  outros: "Outros",
};

export const incomeLabel: Record<Income["category"], string> = {
  servico: "Serviço avulso",
  venda: "Venda avulsa",
  outros: "Outras receitas",
};

export const paymentLabel: Record<Payment, string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
  brasilcard: "Brasilcard",
  dinheiro: "Dinheiro",
};

export const categoryName = (id: string) =>
  ({ celulares: "Celulares", capinhas: "Capinhas", peliculas: "Películas", carregadores: "Carregadores", fones: "Fones", acessorios: "Acessórios" })[id] ?? "Outros";

/** Consertos que entram como receita: com orçamento e já prontos/entregues. */
export const billedRepair = (r: Repair) => Boolean(r.quote) && (r.status === "pronto" || r.status === "entregue");

export const orderCost = (o: Order) => o.items.reduce((c, i) => c + i.cost * i.qty, 0);

export type Source = { orders: Order[]; repairs: Repair[]; expenses: Expense[]; incomes: Income[] };

/** Tudo o que compõe o faturamento de um mês. */
export function monthReport(month: Date, src: Source) {
  const sales = src.orders.filter((o) => o.status !== "cancelado" && sameMonth(o.createdAt, month)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const services = src.repairs.filter((r) => billedRepair(r) && sameMonth(r.createdAt, month)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const incomes = src.incomes.filter((i) => sameMonth(i.date, month)).sort((a, b) => a.date.localeCompare(b.date));
  const expenses = src.expenses.filter((e) => sameMonth(e.date, month)).sort((a, b) => a.date.localeCompare(b.date));

  const salesTotal = sales.reduce((s, o) => s + o.total, 0);
  const servicesTotal = services.reduce((s, r) => s + (r.quote ?? 0), 0);
  const incomesTotal = incomes.reduce((s, i) => s + i.amount, 0);
  const cogs = sales.reduce((s, o) => s + orderCost(o), 0);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const revenue = salesTotal + servicesTotal + incomesTotal;
  const profit = revenue - cogs - spent;

  const byPayment = (Object.keys(paymentLabel) as Payment[])
    .map((p) => ({
      label: paymentLabel[p],
      value: sales.filter((o) => o.payment === p).reduce((s, o) => s + o.total, 0) + incomes.filter((i) => i.payment === p).reduce((s, i) => s + i.amount, 0),
    }))
    .filter((x) => x.value > 0);

  const byCategory = Object.entries(
    sales.flatMap((o) => o.items).reduce<Record<string, number>>((acc, i) => {
      const cat = db.products.get(i.productId)?.category ?? "outros";
      return { ...acc, [cat]: (acc[cat] ?? 0) + i.price * i.qty };
    }, {}),
  )
    .map(([id, value]) => ({ label: categoryName(id), value }))
    .sort((a, b) => b.value - a.value);

  const byExpense = (Object.keys(expenseLabel) as Expense["category"][])
    .map((c) => ({ label: expenseLabel[c], value: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.value > 0);

  return {
    month,
    sales,
    services,
    incomes,
    expenses,
    totals: {
      salesTotal,
      servicesTotal,
      incomesTotal,
      revenue,
      cogs,
      spent,
      profit,
      margin: revenue ? profit / revenue : 0,
      orders: sales.length,
      ticket: sales.length ? salesTotal / sales.length : 0,
    },
    byPayment,
    byCategory,
    byExpense,
  };
}

export type MonthReport = ReturnType<typeof monthReport>;

export const monthTitle = (d: Date) => {
  const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
