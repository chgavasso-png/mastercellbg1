import { useState } from "react";
import { Minus, Plus, Printer, Repeat, ShoppingCart, Trash2 } from "lucide-react";
import { useCollection } from "@/core/store";
import { db } from "@/domain/db";
import { addToCart, cart, cartSummary, evaluateTradeIn, placeOrder, setOrderStatus, tradeConditions } from "@/domain/services";
import type { Channel, Order, OrderStatus, Payment } from "@/domain/types";
import { money, stamp } from "@/core/format";
import { Card, PageHead, SearchBox, Table, Tabs, matches, type Column } from "@/admin/kit";
import { Modal } from "@/ui/Modal";
import { Status, orderStatus } from "@/ui/status";
import { toast } from "@/ui/Toast";

const flow: OrderStatus[] = ["pendente", "pago", "separacao", "enviado", "entregue"];
const channelLabel: Record<Channel, string> = { site: "Site", loja: "Balcão", instagram: "Instagram", whatsapp: "WhatsApp" };
const paymentLabel: Record<Payment, string> = { pix: "Pix", cartao: "Cartão", boleto: "Boleto parcelado", brasilcard: "Brasilcard", dinheiro: "Dinheiro" };

export function Orders() {
  const orders = useCollection(db.orders);
  const [tab, setTab] = useState<"todos" | OrderStatus>("todos");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Order | null>(null);
  const [pos, setPos] = useState(false);

  const rows = [...orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((o) => (tab === "todos" || o.status === tab) && matches(q, o.code, o.customerName));

  const columns: Column<Order>[] = [
    { key: "code", label: "Pedido", sort: (o) => o.createdAt, render: (o) => <b>{o.code}</b> },
    {
      key: "customer",
      label: "Cliente",
      sort: (o) => o.customerName,
      render: (o) => (
        <div className="cell-main" style={{ minWidth: 180 }}>
          <div>
            <b>{o.customerName}</b>
            <span className="faint">
              {o.items.length} {o.items.length > 1 ? "itens" : "item"} · {channelLabel[o.channel]}
              {o.tradeIn && <> · <Repeat size={12} style={{ display: "inline", verticalAlign: "-2px" }} /> troca</>}
            </span>
          </div>
        </div>
      ),
    },
    { key: "date", label: "Data", sort: (o) => o.createdAt, render: (o) => <span className="muted">{stamp(o.createdAt)}</span> },
    { key: "payment", label: "Pagamento", render: (o) => paymentLabel[o.payment] },
    { key: "status", label: "Status", render: (o) => <Status map={orderStatus} value={o.status} /> },
    { key: "total", label: "Total", align: "right", sort: (o) => o.total, render: (o) => <b className="tabular">{money(o.total)}</b> },
  ];

  const current = open && orders.find((o) => o.id === open.id);

  return (
    <>
      <PageHead
        title="Vendas"
        subtitle="Pedidos do site, balcão, Instagram e WhatsApp num só lugar."
        actions={<button className="btn primary" onClick={() => setPos(true)}><ShoppingCart />Nova venda</button>}
      />
      <div className="a-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar pedido ou cliente" />
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "todos" as const, label: "Todos" },
            ...(Object.keys(orderStatus) as OrderStatus[]).map((s) => ({ id: s, label: orderStatus[s].label, count: orders.filter((o) => o.status === s).length || undefined })),
          ]}
        />
      </div>
      <Card className="flush">
        <Table rows={rows.slice(0, 200)} columns={columns} onRow={setOpen} />
      </Card>

      {current && (
        <Modal
          wide
          title={`Pedido ${current.code}`}
          onClose={() => setOpen(null)}
          footer={
            <>
              {current.status !== "cancelado" && current.status !== "entregue" && (
                <button className="btn danger" onClick={() => { setOrderStatus(current.id, "cancelado"); toast("Pedido cancelado e estoque devolvido"); }}>
                  Cancelar pedido
                </button>
              )}
              <span style={{ flex: 1 }} />
              <button className="btn ghost" onClick={() => window.print()}><Printer />Imprimir</button>
              {flow.indexOf(current.status) >= 0 && flow.indexOf(current.status) < flow.length - 1 && (
                <button className="btn primary" onClick={() => {
                  const next = flow[flow.indexOf(current.status) + 1];
                  setOrderStatus(current.id, next);
                  toast(`Status: ${orderStatus[next].label}`);
                }}>
                  Avançar para “{orderStatus[flow[flow.indexOf(current.status) + 1]].label}”
                </button>
              )}
            </>
          }
        >
          {current.status !== "cancelado" && (
            <div className="timeline">
              {flow.map((s, i) => (
                <span key={s} className={i < flow.indexOf(current.status) ? "done" : i === flow.indexOf(current.status) ? "done now" : ""}>
                  {orderStatus[s].label}
                </span>
              ))}
            </div>
          )}
          <div className="detail-grid">
            <div><span>Cliente</span><b>{current.customerName}</b></div>
            <div><span>Canal</span><b>{channelLabel[current.channel]}</b></div>
            <div><span>Pagamento</span><b>{paymentLabel[current.payment]}</b></div>
            <div><span>Data</span><b>{stamp(current.createdAt)}</b></div>
            <div><span>Entrega</span><b>{current.delivery === "entrega" ? "Em domicílio" : "Retirada na loja"}</b></div>
            <div><span>Status</span><Status map={orderStatus} value={current.status} /></div>
            {current.address && <div className="span-all"><span>Endereço</span><b>{current.address.street} · {current.address.district} · {current.address.city}</b></div>}
          </div>
          {current.tradeIn && <TradeInPanel order={current} />}
          <table className="lines">
            <tbody>
              {current.items.map((i, n) => (
                <tr key={n}><td>{i.qty}× {i.name}</td><td>{money(i.price * i.qty)}</td></tr>
              ))}
              {current.discount - (current.tradeIn?.value ?? 0) > 0 && <tr><td className="muted">Desconto {current.coupon}</td><td>-{money(current.discount - (current.tradeIn?.value ?? 0))}</td></tr>}
              {current.tradeIn?.value ? <tr><td className="muted">Usado na troca ({current.tradeIn.device})</td><td>-{money(current.tradeIn.value)}</td></tr> : null}
              <tr><td className="muted">Frete</td><td>{current.shipping ? money(current.shipping) : "Grátis"}</td></tr>
              <tr><td><b>Total</b></td><td>{money(current.total)}</td></tr>
            </tbody>
          </table>
        </Modal>
      )}

      {pos && <PointOfSale onClose={() => setPos(false)} />}
    </>
  );
}

function TradeInPanel({ order }: { order: Order }) {
  const trade = order.tradeIn!;
  const [value, setValue] = useState(trade.value ?? 0);
  return (
    <div className="trade-panel">
      <div className="row between wrap">
        <b className="row"><Repeat size={18} />Celular do cliente na troca</b>
        {trade.value ? <span className="pill ok">Avaliado</span> : <span className="pill warn">Aguardando avaliação</span>}
      </div>
      <div className="detail-grid">
        <div><span>Aparelho</span><b>{trade.device}</b></div>
        <div><span>Armazenamento</span><b>{trade.storage}</b></div>
        <div><span>Estado</span><b>{tradeConditions[trade.condition].label}</b></div>
        {trade.battery && <div><span>Bateria</span><b>{trade.battery}%</b></div>}
        {trade.notes && <div className="span-all"><span>Observações</span><b>{trade.notes}</b></div>}
      </div>
      <div className="row wrap">
        <label className="field" style={{ flex: 1, minWidth: 180 }}>
          <span>Valor avaliado (abatido do total)</span>
          <input type="number" min="0" step="10" value={value} onChange={(e) => setValue(+e.target.value)} />
        </label>
        <button className="btn primary" style={{ alignSelf: "flex-end" }} onClick={() => { evaluateTradeIn(order.id, value); toast("Avaliação registrada · total atualizado"); }}>
          Registrar avaliação
        </button>
      </div>
    </div>
  );
}

function PointOfSale({ onClose }: { onClose: () => void }) {
  const products = useCollection(db.products);
  const customers = useCollection(db.customers);
  const [q, setQ] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [walkIn, setWalkIn] = useState("Cliente balcão");
  const [channel, setChannel] = useState<Channel>("loja");
  const [payment, setPayment] = useState<Payment>("pix");
  const [, force] = useState(0);
  const lines = cart.get().lines;
  const summary = cartSummary(lines, undefined, "retirada");

  const add = (id: string) => {
    addToCart(id);
    cart.set({ open: false });
    force((n) => n + 1);
  };

  const finish = async () => {
    const customer = customers.find((c) => c.id === customerId) ?? db.customers.insert({ name: walkIn, email: "", phone: "", marketing: false });
    const order = await placeOrder({ customer, payment, delivery: "retirada", channel });
    if (payment !== "pix") setOrderStatus(order.id, "pago");
    setOrderStatus(order.id, "entregue");
    toast(`Venda ${order.code} registrada`);
    onClose();
  };

  return (
    <Modal
      wide
      title="Nova venda"
      onClose={onClose}
      footer={
        <>
          <span className="muted" style={{ marginRight: "auto" }}>{summary.count} itens</span>
          <strong className="price">{money(summary.total)}</strong>
          <button className="btn primary" disabled={!summary.rows.length} onClick={finish}>Registrar venda</button>
        </>
      }
    >
      <div className="pos">
        <div className="stack">
          <SearchBox value={q} onChange={setQ} placeholder="Buscar produto" />
          <ul className="pos-list">
            {products.filter((p) => p.active && matches(q, p.name, p.brand)).slice(0, 8).map((p) => (
              <li key={p.id}>
                <div><b>{p.name}</b><span className="faint">{p.stock} em estoque</span></div>
                <span className="tabular">{money(p.price)}</span>
                <button className="icon-btn" disabled={p.stock <= 0} onClick={() => add(p.id)} aria-label="Adicionar"><Plus /></button>
              </li>
            ))}
          </ul>
        </div>
        <div className="stack">
          <div className="grid-2">
            <label className="field">
              <span>Cliente</span>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Não identificado</option>
                {customers.filter((c) => c.email).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            {!customerId ? (
              <label className="field"><span>Nome</span><input value={walkIn} onChange={(e) => setWalkIn(e.target.value)} /></label>
            ) : <span />}
            <label className="field">
              <span>Canal</span>
              <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
                {Object.entries(channelLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Pagamento</span>
              <select value={payment} onChange={(e) => setPayment(e.target.value as Payment)}>
                {Object.entries(paymentLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <ul className="pos-list cart">
            {summary.rows.length === 0 && <li className="faint">Adicione produtos à venda</li>}
            {summary.rows.map(({ product, line }, i) => (
              <li key={i}>
                <div><b>{product.name}</b><span className="faint">{money(product.price)} un.</span></div>
                <div className="qty">
                  <button onClick={() => { cart.set({ lines: lines.map((l, n) => (n === i ? { ...l, qty: l.qty - 1 } : l)).filter((l) => l.qty > 0) }); force((n) => n + 1); }}>
                    {line.qty > 1 ? <Minus /> : <Trash2 />}
                  </button>
                  <span>{line.qty}</span>
                  <button onClick={() => add(product.id)}><Plus /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
