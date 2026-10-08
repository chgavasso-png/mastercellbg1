import type { Workbook, Worksheet, Cell } from "exceljs";
import { deviceLabel, store } from "@/domain/db";
import { orderStatus, repairStatus } from "@/ui/status";
import { expenseLabel, incomeLabel, monthTitle, orderCost, paymentLabel, type MonthReport } from "./data";

// Cores da marca (sem #, no formato do Excel)
const NIGHT = "FF070C2F";
const NAVY = "FF131F7B";
const BRAND = "FFFCD404";
const SURFACE = "FFF6F7FB";
const ZEBRA = "FFFAFAFC";
const LINE = "FFDBDBE4";
const MUTED = "FF6B6F8E";
const OK = "FF15803D";
const BAD = "FFB91C1C";
const WHITE = "FFFFFFFF";

const BRL = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
const PCT = "0.0%";
const DATE = "dd/mm/yyyy";
const FONT = "Calibri";

const fill = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });
const thin = { style: "thin" as const, color: { argb: LINE } };

type Col = { header: string; width: number; key: string; money?: boolean; date?: boolean; pct?: boolean; align?: "left" | "center" | "right"; sum?: boolean };

/** Faixa escura com logo, nome e contatos da loja no topo da aba. */
function brandHeader(ws: Worksheet, logoId: number | null, lastCol: number, title: string, subtitle: string) {
  const info = store.get();
  for (let r = 1; r <= 5; r++) {
    ws.getRow(r).height = r === 1 ? 10 : 22;
    for (let c = 1; c <= lastCol; c++) ws.getCell(r, c).fill = fill(NIGHT);
  }
  ws.getRow(6).height = 4;
  for (let c = 1; c <= lastCol; c++) ws.getCell(6, c).fill = fill(BRAND);

  if (logoId !== null) ws.addImage(logoId, { tl: { col: 0.25, row: 0.35 }, ext: { width: 150, height: 102 }, editAs: "oneCell" });

  const textCol = Math.min(3, lastCol);
  const put = (row: number, value: string, size: number, color: string, bold = false) => {
    ws.mergeCells(row, textCol, row, lastCol);
    const cell = ws.getCell(row, textCol);
    cell.value = value;
    cell.font = { name: FONT, size, bold, color: { argb: color } };
    cell.alignment = { vertical: "middle", horizontal: "right" };
  };
  put(2, info.name, 18, WHITE, true);
  put(3, info.address, 10, "FFD7DAEF");
  put(4, `WhatsApp ${info.phone}  ·  @${info.instagram}`, 10, "FFD7DAEF");
  put(5, info.hours, 9, "FF9CA4D0");

  ws.getRow(8).height = 26;
  ws.mergeCells(8, 1, 8, lastCol);
  ws.getCell(8, 1).value = title;
  ws.getCell(8, 1).font = { name: FONT, size: 16, bold: true, color: { argb: NAVY } };
  ws.mergeCells(9, 1, 9, lastCol);
  ws.getCell(9, 1).value = subtitle;
  ws.getCell(9, 1).font = { name: FONT, size: 10, color: { argb: MUTED } };
}

function setup(ws: Worksheet, landscape: boolean) {
  const info = store.get();
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: landscape ? "landscape" : "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 },
    horizontalCentered: true,
  };
  ws.headerFooter.oddFooter = `&L&8${info.name} · ${info.address}&R&8Página &P de &N`;
  // mantém o cabeçalho congelado das tabelas, só esconde as linhas de grade
  if (!ws.views.length) ws.views = [{ showGridLines: false }];
}

/** Tabela com cabeçalho escuro, linhas zebradas, filtros e linha de total com fórmula. */
function table(ws: Worksheet, start: number, cols: Col[], rows: Record<string, unknown>[], totalLabel = "Total") {
  // colunas de valor ganham folga para o botão de filtro não cobrir o título
  cols.forEach((c, i) => (ws.getColumn(i + 1).width = c.money ? Math.max(c.width, c.header.length + 6) : c.width));

  const head = ws.getRow(start);
  head.height = 22;
  cols.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.header;
    cell.fill = fill(NIGHT);
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: WHITE } };
    cell.alignment = { vertical: "middle", horizontal: c.align ?? "left" };
    cell.border = { bottom: { style: "medium", color: { argb: BRAND } } };
  });

  rows.forEach((data, n) => {
    const row = ws.getRow(start + 1 + n);
    row.height = 18;
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = data[c.key] as Cell["value"];
      cell.font = { name: FONT, size: 10 };
      cell.alignment = { vertical: "middle", horizontal: c.money || c.pct ? "right" : c.align ?? "left", wrapText: !c.money && !c.date };
      if (c.money) cell.numFmt = BRL;
      if (c.date) cell.numFmt = DATE;
      if (c.pct) cell.numFmt = PCT;
      cell.border = { bottom: thin };
      if (n % 2) cell.fill = fill(ZEBRA);
    });
  });

  const end = start + rows.length;
  const total = ws.getRow(end + 1);
  total.height = 22;
  cols.forEach((c, i) => {
    const cell = total.getCell(i + 1);
    const letter = ws.getColumn(i + 1).letter;
    if (i === 0) cell.value = rows.length ? totalLabel : "Nenhum lançamento no mês";
    else if (c.sum && rows.length) cell.value = { formula: `SUM(${letter}${start + 1}:${letter}${end})`, result: rows.reduce((s, r) => s + ((r[c.key] as number) || 0), 0) };
    cell.fill = fill(SURFACE);
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: c.money ? "right" : "left" };
    if (c.money) cell.numFmt = BRL;
    cell.border = { top: { style: "thin", color: { argb: NAVY } } };
  });

  if (rows.length) ws.autoFilter = { from: { row: start, column: 1 }, to: { row: end, column: cols.length } };
  ws.views = [{ state: "frozen", ySplit: start, showGridLines: false }];
  return end + 1;
}

function section(ws: Worksheet, row: number, label: string, lastCol: number) {
  ws.getRow(row).height = 22;
  ws.mergeCells(row, 1, row, lastCol);
  const cell = ws.getCell(row, 1);
  cell.value = label.toUpperCase();
  cell.font = { name: FONT, size: 10, bold: true, color: { argb: NAVY } };
  cell.border = { bottom: { style: "medium", color: { argb: BRAND } } };
  cell.alignment = { vertical: "bottom" };
}

/** Lista "rótulo | valor | % do total" usada nos quadros do resumo. */
function breakdown(ws: Worksheet, row: number, items: { label: string; value: number }[]) {
  const total = items.reduce((s, x) => s + x.value, 0);
  if (!items.length) {
    ws.getCell(row, 1).value = "Sem movimento no mês";
    ws.getCell(row, 1).font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } };
    return row + 1;
  }
  items.forEach((x, i) => {
    const r = ws.getRow(row + i);
    r.height = 18;
    ws.mergeCells(row + i, 1, row + i, 3);
    r.getCell(1).value = x.label;
    r.getCell(4).value = x.value;
    r.getCell(4).numFmt = BRL;
    r.getCell(5).value = total ? x.value / total : 0;
    r.getCell(5).numFmt = PCT;
    [1, 4, 5].forEach((c) => {
      r.getCell(c).font = { name: FONT, size: 10 };
      r.getCell(c).border = { bottom: thin };
      r.getCell(c).alignment = { horizontal: c === 1 ? "left" : "right", vertical: "middle" };
    });
    r.getCell(5).font = { name: FONT, size: 10, color: { argb: MUTED } };
  });
  return row + items.length;
}

async function loadLogo(wb: Workbook) {
  try {
    const res = await fetch("/brand/logo.png");
    if (!res.ok) return null;
    return wb.addImage({ buffer: await res.arrayBuffer(), extension: "png" });
  } catch {
    return null;
  }
}

/** Monta a planilha do mês (sem baixar). */
export async function buildMonthWorkbook(report: MonthReport) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const info = store.get();
  const title = monthTitle(report.month);
  const generated = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  wb.creator = info.name;
  wb.company = info.name;
  wb.title = `Faturamento ${title}`;
  wb.created = new Date();
  const logo = await loadLogo(wb);
  const t = report.totals;

  // ── Resumo ────────────────────────────────────────────────
  const ws = wb.addWorksheet("Resumo", { properties: { tabColor: { argb: BRAND } } });
  [22, 16, 16, 18, 14, 4].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.getColumn(6).width = 18;
  brandHeader(ws, logo, 6, "Relatório de faturamento", `${title}  ·  gerado em ${generated}`);

  // Cartões de indicadores: 3 por linha, cada um ocupando 2 colunas
  const cards: { label: string; value: number; fmt: string; tone?: string }[] = [
    { label: "Faturamento bruto", value: t.revenue, fmt: BRL },
    { label: "Custo das mercadorias", value: t.cogs, fmt: BRL },
    { label: "Despesas", value: t.spent, fmt: BRL },
    { label: "Lucro líquido", value: t.profit, fmt: BRL, tone: t.profit >= 0 ? OK : BAD },
    { label: "Margem líquida", value: t.margin, fmt: PCT, tone: t.profit >= 0 ? OK : BAD },
    { label: `Ticket médio · ${t.orders} pedido${t.orders === 1 ? "" : "s"}`, value: t.ticket, fmt: BRL },
  ];
  cards.forEach((card, i) => {
    const row = 11 + Math.floor(i / 3) * 3;
    const col = 1 + (i % 3) * 2;
    ws.getRow(row).height = 18;
    ws.getRow(row + 1).height = 28;
    ws.mergeCells(row, col, row, col + 1);
    ws.mergeCells(row + 1, col, row + 1, col + 1);
    const label = ws.getCell(row, col);
    const value = ws.getCell(row + 1, col);
    label.value = card.label;
    label.font = { name: FONT, size: 9, color: { argb: MUTED } };
    label.alignment = { indent: 1, vertical: "bottom" };
    value.value = card.value;
    value.numFmt = card.fmt;
    value.font = { name: FONT, size: 16, bold: true, color: { argb: card.tone ?? NAVY } };
    value.alignment = { indent: 1, vertical: "middle" };
    for (const r of [row, row + 1]) for (const c of [col, col + 1]) {
      const cell = ws.getCell(r, c);
      cell.fill = fill(i === 3 ? "FFFFF9DC" : SURFACE);
      cell.border = { left: c === col ? { style: "medium", color: { argb: i === 3 ? BRAND : NAVY } } : undefined };
    }
  });

  // DRE com fórmulas, para conferir no próprio Excel
  let r = 18;
  section(ws, r, "Demonstrativo do resultado (DRE)", 6);
  r += 1;
  const dre: [string, number | { formula: string; result: number }, "total" | "sub" | "line" | "pct"][] = [
    ["Vendas (site e balcão)", t.salesTotal, "line"],
    ["Assistência técnica", t.servicesTotal, "line"],
    ["Receitas avulsas", t.incomesTotal, "line"],
    ["(=) Receita bruta", { formula: `SUM(D${r}:D${r + 2})`, result: t.revenue }, "sub"],
    ["(−) Custo das mercadorias vendidas", -t.cogs, "line"],
    ["(=) Lucro bruto", { formula: `D${r + 3}+D${r + 4}`, result: t.revenue - t.cogs }, "sub"],
    ["(−) Despesas operacionais", -t.spent, "line"],
    ["(=) Lucro líquido", { formula: `D${r + 5}+D${r + 6}`, result: t.profit }, "total"],
    ["Margem líquida", { formula: `IF(D${r + 3}=0,0,D${r + 7}/D${r + 3})`, result: t.margin }, "pct"],
  ];
  dre.forEach(([label, value, kind], i) => {
    const row = ws.getRow(r + i);
    row.height = kind === "total" ? 24 : 19;
    ws.mergeCells(r + i, 1, r + i, 3);
    row.getCell(1).value = label;
    row.getCell(4).value = value;
    row.getCell(4).numFmt = kind === "pct" ? PCT : BRL;
    const strong = kind !== "line";
    for (const c of [1, 4]) {
      const cell = row.getCell(c);
      cell.font = { name: FONT, size: kind === "total" ? 12 : 10, bold: strong, color: { argb: kind === "total" ? (t.profit >= 0 ? OK : BAD) : strong ? NAVY : "FF2B2F4A" } };
      cell.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "right", indent: c === 1 && !strong ? 1 : 0 };
      cell.border = { bottom: thin };
      if (kind === "total") cell.fill = fill("FFFFF9DC");
      else if (strong) cell.fill = fill(SURFACE);
    }
  });
  r += dre.length + 1;

  section(ws, r, "Receita por forma de pagamento", 6);
  r = breakdown(ws, r + 1, report.byPayment) + 1;
  section(ws, r, "Vendas por categoria de produto", 6);
  r = breakdown(ws, r + 1, report.byCategory) + 1;
  section(ws, r, "Despesas por categoria", 6);
  r = breakdown(ws, r + 1, report.byExpense) + 2;

  ws.mergeCells(r, 1, r, 6);
  ws.getCell(r, 1).value = "Receita de assistência considera ordens de serviço com orçamento já prontas ou entregues. Pedidos cancelados não entram no faturamento. Detalhes nas abas seguintes.";
  ws.getCell(r, 1).font = { name: FONT, size: 8, italic: true, color: { argb: MUTED } };
  ws.getCell(r, 1).alignment = { wrapText: true, vertical: "top" };
  ws.getRow(r).height = 30;
  setup(ws, false);

  // ── Vendas ────────────────────────────────────────────────
  const vs = wb.addWorksheet("Vendas", { properties: { tabColor: { argb: NAVY } } });
  const saleCols: Col[] = [
    { header: "Data", key: "date", width: 12, date: true },
    { header: "Pedido", key: "code", width: 11 },
    { header: "Cliente", key: "customer", width: 24 },
    { header: "Itens", key: "items", width: 40 },
    { header: "Canal", key: "channel", width: 11 },
    { header: "Pagamento", key: "payment", width: 12 },
    { header: "Status", key: "status", width: 16 },
    { header: "Desconto", key: "discount", width: 13, money: true, sum: true },
    { header: "Frete", key: "shipping", width: 11, money: true, sum: true },
    { header: "Total", key: "total", width: 14, money: true, sum: true },
    { header: "Custo", key: "cost", width: 13, money: true, sum: true },
    { header: "Lucro bruto", key: "profit", width: 14, money: true, sum: true },
  ];
  brandHeader(vs, logo, saleCols.length, "Vendas do mês", `${title}  ·  ${report.sales.length} pedido(s)`);
  table(vs, 11, saleCols, report.sales.map((o) => ({
    date: new Date(o.createdAt),
    code: o.code,
    customer: o.customerName,
    items: o.items.map((i) => `${i.qty}× ${i.name}`).join(", "),
    channel: { site: "Site", loja: "Balcão", instagram: "Instagram", whatsapp: "WhatsApp" }[o.channel],
    payment: paymentLabel[o.payment],
    status: orderStatus[o.status].label,
    discount: o.discount,
    shipping: o.shipping,
    total: o.total,
    cost: orderCost(o),
    profit: o.total - orderCost(o),
  })));
  setup(vs, true);

  // ── Assistência ───────────────────────────────────────────
  const as = wb.addWorksheet("Assistência", { properties: { tabColor: { argb: NAVY } } });
  const repairCols: Col[] = [
    { header: "Entrada", key: "date", width: 12, date: true },
    { header: "OS", key: "protocol", width: 11 },
    { header: "Cliente", key: "customer", width: 24 },
    { header: "Contato", key: "phone", width: 17 },
    { header: "Aparelho", key: "device", width: 26 },
    { header: "Serviço", key: "issue", width: 34 },
    { header: "Status", key: "status", width: 18 },
    { header: "Valor", key: "quote", width: 14, money: true, sum: true },
  ];
  brandHeader(as, logo, repairCols.length, "Assistência técnica", `${title}  ·  ${report.services.length} ordem(ns) faturada(s)`);
  table(as, 11, repairCols, report.services.map((x) => ({
    date: new Date(x.createdAt),
    protocol: x.protocol,
    customer: x.customerName,
    phone: x.phone,
    device: `${deviceLabel(x.kind)} · ${x.device}`,
    issue: x.issue,
    status: repairStatus[x.status].label,
    quote: x.quote ?? 0,
  })));
  setup(as, true);

  // ── Lançamentos (receitas avulsas + despesas) ────────────
  const ls = wb.addWorksheet("Lançamentos", { properties: { tabColor: { argb: BRAND } } });
  const entryCols: Col[] = [
    { header: "Data", key: "date", width: 12, date: true },
    { header: "Tipo", key: "kind", width: 11 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Descrição", key: "description", width: 40 },
    { header: "Pagamento", key: "payment", width: 13 },
    { header: "Entrada", key: "in", width: 14, money: true, sum: true },
    { header: "Saída", key: "out", width: 14, money: true, sum: true },
  ];
  brandHeader(ls, logo, entryCols.length, "Receitas avulsas e despesas", `${title}  ·  ${report.incomes.length} receita(s) e ${report.expenses.length} despesa(s)`);
  const entries = [
    ...report.incomes.map((i) => ({ date: new Date(i.date), kind: "Receita", category: incomeLabel[i.category], description: i.description, payment: i.payment ? paymentLabel[i.payment] : "—", in: i.amount, out: null })),
    ...report.expenses.map((e) => ({ date: new Date(e.date), kind: "Despesa", category: expenseLabel[e.category], description: e.description, payment: "—", in: null, out: e.amount })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  const end = table(ls, 11, entryCols, entries);
  if (entries.length) {
    const bal = ls.getRow(end + 1);
    bal.height = 22;
    bal.getCell(1).value = "Saldo dos lançamentos";
    bal.getCell(6).value = { formula: `F${end}-G${end}`, result: report.totals.incomesTotal - report.totals.spent };
    bal.getCell(6).numFmt = BRL;
    [1, 6].forEach((c) => (bal.getCell(c).font = { name: FONT, size: 10, bold: true, color: { argb: NAVY } }));
  }
  setup(ls, true);

  return wb.xlsx.writeBuffer();
}

export async function downloadMonthExcel(report: MonthReport) {
  const info = store.get();
  const buffer = await buildMonthWorkbook(report);
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const ym = `${report.month.getFullYear()}-${String(report.month.getMonth() + 1).padStart(2, "0")}`;
  a.download = `Faturamento ${info.name} ${ym}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
