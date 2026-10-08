import { useEffect, useState } from "react";
import { Bike, Clock, MapPin, Package, Truck } from "lucide-react";
import { definePlugin } from "@/core/plugins";
import { events } from "@/core/events";
import { useCollection } from "@/core/store";
import { db, session } from "@/domain/db";
import { setOrderStatus } from "@/domain/services";
import type { Order, Shipment, ShipmentStatus } from "@/domain/types";
import { day, money } from "@/core/format";
import { Kpi, PageHead } from "@/admin/kit";
import { Modal } from "@/ui/Modal";
import { shipmentStatus } from "@/ui/status";
import { toast } from "@/ui/Toast";

const columns: ShipmentStatus[] = ["aguardando", "postado", "transito", "entregue"];

/** Copia a situação da entrega para o pedido: é por ele que o cliente acompanha e é avisado. */
function mirror(id: string) {
  const s = db.shipments.get(id);
  if (!s || !db.orders.get(s.orderId)) return;
  db.orders.update(s.orderId, { shipment: { status: s.status, carrier: s.carrier, tracking: s.tracking, eta: s.eta } });
}

function move(shipment: Shipment, status: ShipmentStatus) {
  db.shipments.update(shipment.id, { status });
  mirror(shipment.id);
  const order = db.orders.get(shipment.orderId);
  if (!order) return;
  if ((status === "postado" || status === "transito") && order.status !== "enviado") setOrderStatus(order.id, "enviado");
  if (status === "entregue" && order.status !== "entregue") setOrderStatus(order.id, "entregue");
}

function ship(order: Order) {
  if (!session.get().admin || order.delivery !== "entrega" || !["pago", "separacao"].includes(order.status)) return;
  if (db.shipments.find((s) => s.orderId === order.id)) return;
  const created = db.shipments.insert({
    orderId: order.id,
    orderCode: order.code,
    customerName: order.customerName,
    carrier: "Motoboy",
    status: "aguardando",
    address: order.address,
    cost: 12,
    eta: new Date(Date.now() + 2 * 864e5).toISOString(),
  });
  mirror(created.id);
}

function Logistics() {
  const shipments = useCollection(db.shipments);
  const orders = useCollection(db.orders);

  useEffect(() => {
    orders.forEach(ship);
  }, [orders]);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<ShipmentStatus | null>(null);
  const [edit, setEdit] = useState<Shipment | null>(null);

  const active = shipments.filter((s) => s.status !== "entregue");

  return (
    <>
      <PageHead title="Logística" subtitle="Arraste os cards para atualizar o status da entrega — o pedido acompanha automaticamente." />

      <div className="kpis">
        <Kpi label="Para despachar" value={shipments.filter((s) => s.status === "aguardando").length} icon={Package} />
        <Kpi label="Em rota" value={shipments.filter((s) => s.status === "postado" || s.status === "transito").length} icon={Truck} />
        <Kpi label="Entregues" value={shipments.filter((s) => s.status === "entregue").length} />
        <Kpi tone="dark" label="Custo de frete ativo" value={money(active.reduce((s, x) => s + x.cost, 0))} />
      </div>

      <div className="kanban">
        {columns.map((col) => {
          const list = shipments.filter((s) => s.status === col).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return (
            <div
              key={col}
              className={`kanban-col${over === col ? " drop" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setOver(col); }}
              onDragLeave={() => setOver(null)}
              onDrop={() => {
                const s = shipments.find((x) => x.id === drag);
                if (s && s.status !== col) {
                  move(s, col);
                  toast(`${s.orderCode} → ${shipmentStatus[col].label}`);
                }
                setDrag(null);
                setOver(null);
              }}
            >
              <header>
                <b>{shipmentStatus[col].label}</b>
                <span className={`pill plain ${shipmentStatus[col].tone}`}>{list.length}</span>
              </header>
              {list.map((s) => (
                <article key={s.id} className="kanban-card" draggable onDragStart={() => setDrag(s.id)} onClick={() => setEdit(s)}>
                  <div className="row between">
                    <b>{s.orderCode}</b>
                    <span className="pill plain">{s.carrier === "Motoboy" ? <Bike /> : <Truck />}{s.carrier}</span>
                  </div>
                  <span>{s.customerName}</span>
                  {s.address && <span className="row faint"><MapPin />{s.address.street}</span>}
                  <span className="row faint"><Clock />{s.tracking ?? "sem rastreio"} · prev. {s.eta ? day(s.eta) : "—"}</span>
                </article>
              ))}
            </div>
          );
        })}
      </div>

      {edit && (
        <Modal
          title={`Entrega ${edit.orderCode}`}
          onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setEdit(null)}>Fechar</button>
              <button className="btn primary" onClick={() => {
                const { id, status, ...rest } = edit;
                db.shipments.update(id, rest);
                const original = shipments.find((s) => s.id === id);
                if (original && original.status !== status) move(original, status);
                else mirror(id);
                setEdit(null);
                toast("Entrega atualizada");
              }}>Salvar</button>
            </>
          }
        >
          <div className="grid-2">
            <label className="field">
              <span>Transportadora</span>
              <select value={edit.carrier} onChange={(e) => setEdit({ ...edit, carrier: e.target.value as Shipment["carrier"] })}>
                {["Correios", "Motoboy", "Jadlog", "Retirada"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="field"><span>Código de rastreio</span><input value={edit.tracking ?? ""} onChange={(e) => setEdit({ ...edit, tracking: e.target.value })} /></label>
            <label className="field"><span>Custo do frete</span><input type="number" step="0.01" value={edit.cost} onChange={(e) => setEdit({ ...edit, cost: +e.target.value })} /></label>
            <label className="field"><span>Previsão</span><input type="date" value={edit.eta?.slice(0, 10) ?? ""} onChange={(e) => setEdit({ ...edit, eta: new Date(`${e.target.value}T12:00`).toISOString() })} /></label>
            <label className="field span-2">
              <span>Status</span>
              <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as ShipmentStatus })}>
                {columns.map((c) => <option key={c} value={c}>{shipmentStatus[c].label}</option>)}
              </select>
            </label>
            {edit.address && (
              <p className="span-2 muted">{edit.address.street} · {edit.address.district} · {edit.address.city} · {edit.address.zip}</p>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export default definePlugin({
  id: "logistica",
  name: "Logística",
  admin: [
    {
      path: "logistica",
      label: "Logística",
      icon: Truck,
      group: "Operação",
      order: 30,
      element: <Logistics />,
      badge: () => db.shipments.all().filter((s) => s.status === "aguardando").length,
    },
  ],
  setup: () => events.on("order:status", ({ order }) => ship(order)),
});
