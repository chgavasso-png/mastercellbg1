import { useState } from "react";
import { PackageCheck, Plus, Trash2 } from "lucide-react";
import { useCollection } from "@/core/store";
import { db } from "@/domain/db";
import { receivePurchase } from "@/domain/services";
import type { Purchase } from "@/domain/types";
import { day, money } from "@/core/format";
import { Card, Kpi, PageHead, Table, type Column } from "@/admin/kit";
import { Modal } from "@/ui/Modal";
import { toast } from "@/ui/Toast";

type Line = { productId: string; qty: number; cost: number };

export function Purchases() {
  const purchases = useCollection(db.purchases);
  const products = useCollection(db.products);
  const [creating, setCreating] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const open = purchases.filter((p) => p.status === "pedido");
  const monthTotal = purchases
    .filter((p) => new Date(p.createdAt).getMonth() === new Date().getMonth())
    .reduce((s, p) => s + p.total, 0);

  const columns: Column<Purchase>[] = [
    {
      key: "supplier",
      label: "Fornecedor",
      sort: (p) => p.supplier,
      render: (p) => (
        <div className="cell-main">
          <div>
            <b>{p.supplier}</b>
            <span className="faint">{p.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}</span>
          </div>
        </div>
      ),
    },
    { key: "date", label: "Pedido em", sort: (p) => p.createdAt, render: (p) => <span className="muted">{day(p.createdAt)}</span> },
    { key: "eta", label: "Chegada", render: (p) => <span className="muted">{p.receivedAt ? day(p.receivedAt) : p.expectedAt ? `prev. ${day(p.expectedAt)}` : "—"}</span> },
    { key: "status", label: "Status", render: (p) => <span className={`pill ${p.status === "recebido" ? "ok" : "warn"}`}>{p.status === "recebido" ? "Recebido" : "A caminho"}</span> },
    { key: "total", label: "Total", align: "right", sort: (p) => p.total, render: (p) => <b className="tabular">{money(p.total)}</b> },
    {
      key: "act",
      label: "",
      align: "right",
      render: (p) =>
        p.status === "pedido" && (
          <button className="btn soft sm" onClick={() => { receivePurchase(p); toast("Mercadoria recebida · estoque atualizado"); }}>
            <PackageCheck />Dar entrada
          </button>
        ),
    },
  ];

  const total = lines.reduce((s, l) => s + l.qty * l.cost, 0);

  const save = () => {
    const items = lines
      .filter((l) => l.productId && l.qty > 0)
      .map((l) => ({ ...l, name: products.find((p) => p.id === l.productId)?.name ?? "" }));
    if (!supplier.trim() || !items.length) return toast("Informe fornecedor e itens");
    db.purchases.insert({ supplier, items, total, status: "pedido", expectedAt: expectedAt ? new Date(expectedAt).toISOString() : undefined });
    toast("Compra registrada");
    setCreating(false);
    setSupplier("");
    setLines([]);
  };

  return (
    <>
      <PageHead
        title="Compras"
        subtitle="Reposição de estoque com fornecedores."
        actions={<button className="btn primary" onClick={() => { setCreating(true); setLines([{ productId: "", qty: 1, cost: 0 }]); }}><Plus />Nova compra</button>}
      />
      <div className="kpis three">
        <Kpi label="Comprado no mês" value={money(monthTotal)} />
        <Kpi label="Pedidos a caminho" value={open.length} hint={money(open.reduce((s, p) => s + p.total, 0))} />
        <Kpi label="Fornecedores" value={new Set(purchases.map((p) => p.supplier)).size} />
      </div>
      <Card className="flush">
        <Table rows={[...purchases].sort((a, b) => b.createdAt.localeCompare(a.createdAt))} columns={columns} />
      </Card>

      {creating && (
        <Modal
          wide
          title="Nova compra"
          onClose={() => setCreating(false)}
          footer={
            <>
              <strong className="price" style={{ marginRight: "auto" }}>{money(total)}</strong>
              <button className="btn ghost" onClick={() => setCreating(false)}>Cancelar</button>
              <button className="btn primary" onClick={save}>Registrar compra</button>
            </>
          }
        >
          <div className="stack">
            <div className="grid-2">
              <label className="field"><span>Fornecedor</span><input value={supplier} onChange={(e) => setSupplier(e.target.value)} list="suppliers" autoFocus /></label>
              <datalist id="suppliers">{[...new Set(purchases.map((p) => p.supplier))].map((s) => <option key={s} value={s} />)}</datalist>
              <label className="field"><span>Previsão de chegada</span><input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} /></label>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="purchase-line">
                <label className="field">
                  <span>Produto</span>
                  <select
                    value={l.productId}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      setLines(lines.map((x, n) => (n === i ? { ...x, productId: e.target.value, cost: p?.cost ?? 0 } : x)));
                    }}
                  >
                    <option value="">Selecione…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <label className="field"><span>Qtd.</span><input type="number" min="1" value={l.qty} onChange={(e) => setLines(lines.map((x, n) => (n === i ? { ...x, qty: +e.target.value } : x)))} /></label>
                <label className="field"><span>Custo un.</span><input type="number" step="0.01" min="0" value={l.cost} onChange={(e) => setLines(lines.map((x, n) => (n === i ? { ...x, cost: +e.target.value } : x)))} /></label>
                <button className="icon-btn" onClick={() => setLines(lines.filter((_, n) => n !== i))} aria-label="Remover"><Trash2 /></button>
              </div>
            ))}
            <button className="btn soft sm" style={{ justifySelf: "start" }} onClick={() => setLines([...lines, { productId: "", qty: 1, cost: 0 }])}><Plus />Adicionar item</button>
          </div>
        </Modal>
      )}
    </>
  );
}
