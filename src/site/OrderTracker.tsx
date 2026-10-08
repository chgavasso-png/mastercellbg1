import { useState } from "react";
import { Bike, CalendarClock, Car, Check, CircleCheck, Copy, CreditCard, ExternalLink, House, MapPin, PackageOpen, Receipt, Store, Truck, XCircle, type LucideIcon } from "lucide-react";
import { useDocument } from "@/core/store";
import { linkLabel, safeLink, slotLabel } from "@/core/delivery";
import { store } from "@/domain/db";
import type { Order } from "@/domain/types";

const carrierIcon = (carrier?: string): LucideIcon =>
  carrier === "Motoboy" ? Bike : carrier === "Uber" || carrier === "99" ? Car : Truck;

const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

/** Em que etapa o pedido está, de 0 (feito) a 4 (entregue). */
function stepOf(o: Order) {
  if (o.status === "entregue" || o.shipment?.status === "entregue") return 4;
  if (o.status === "enviado" || o.shipment?.status === "postado" || o.shipment?.status === "transito") return 3;
  if (o.status === "separacao") return 2;
  if (o.status === "pago") return 1;
  return 0;
}

/** Acompanhamento do pedido para o cliente: etapas + o que está acontecendo agora. */
export function OrderTracker({ order }: { order: Order }) {
  const info = useDocument(store);
  const [copied, setCopied] = useState(false);
  const pickup = order.delivery === "retirada";
  const ship = order.shipment;
  const step = stepOf(order);
  const link = step < 4 ? safeLink(ship?.link) : undefined;
  const Vehicle = carrierIcon(ship?.carrier);

  if (order.status === "cancelado")
    return (
      <div className="tracker cancelled">
        <div className="tracker-now">
          <span className="tracker-icon"><XCircle /></span>
          <div><b>Pedido cancelado</b><span>Ficou alguma dúvida? Fale com a gente no WhatsApp.</span></div>
        </div>
      </div>
    );

  const steps: { label: string; icon: LucideIcon }[] = [
    { label: "Pedido feito", icon: Receipt },
    { label: "Pago", icon: CreditCard },
    { label: "Separando", icon: PackageOpen },
    pickup ? { label: "Pronto p/ retirar", icon: Store } : { label: "A caminho", icon: Vehicle },
    { label: pickup ? "Retirado" : "Entregue", icon: House },
  ];

  const when = ship?.slot?.date
    ? `Entrega agendada: ${slotLabel(ship.slot)}`
    : ship?.eta
      ? `Previsão de entrega: ${shortDay(ship.eta)}`
      : undefined;

  const now: { icon: LucideIcon; title: string; detail?: string } = (() => {
    switch (step) {
      case 0: return { icon: CreditCard, title: "Aguardando pagamento", detail: "Assim que o pagamento cair, começamos a separar." };
      case 1: return { icon: CircleCheck, title: "Pagamento confirmado", detail: "Já vamos separar seus produtos." };
      case 2: return pickup
        ? { icon: PackageOpen, title: "Separando seu pedido", detail: "Avisamos aqui quando estiver pronto para retirar." }
        : { icon: PackageOpen, title: "Separando seu pedido", detail: when ?? "Em breve sai para entrega." };
      case 3: return pickup
        ? { icon: Store, title: "Pronto para retirar", detail: `${info.address} · ${info.hours}` }
        : { icon: Vehicle, title: ship?.carrier && ship.carrier !== "Retirada" ? `A caminho com ${ship.carrier === "Uber" || ship.carrier === "99" ? `a ${ship.carrier}` : `o ${ship.carrier}`}` : "A caminho", detail: when };
      default: return { icon: House, title: pickup ? "Pedido retirado" : "Pedido entregue", detail: "Obrigado pela compra! 💛" };
    }
  })();

  const copy = async () => {
    if (!ship?.tracking) return;
    try {
      await navigator.clipboard.writeText(ship.tracking);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* sem permissão de área de transferência */
    }
  };

  return (
    <div className="tracker">
      <ol className="tracker-steps" aria-label="Etapas do pedido">
        {steps.map((s, i) => (
          <li key={s.label} className={i < step ? "done" : i === step ? "now" : ""} aria-current={i === step ? "step" : undefined}>
            <span>{i < step ? <Check /> : <s.icon />}</span>
            <small>{s.label}</small>
          </li>
        ))}
      </ol>

      <div className="tracker-now">
        <span className="tracker-icon"><now.icon /></span>
        <div>
          <b>{now.title}</b>
          {now.detail && <span>{now.detail.startsWith("Entrega agendada") ? <><CalendarClock />{now.detail}</> : now.detail}</span>}
        </div>
      </div>

      {(ship?.tracking || link || (!pickup && order.address?.street && step < 4)) && (
        <div className="tracker-extra">
          {!pickup && order.address?.street && step < 4 && (
            <span><MapPin />{order.address.street}{order.address.district ? `, ${order.address.district}` : ""}</span>
          )}
          {ship?.tracking && (
            <button type="button" className="tracker-code" onClick={copy} title="Copiar código">
              Rastreio <b>{ship.tracking}</b>{copied ? <Check /> : <Copy />}
            </button>
          )}
          {link && (
            <a className="btn primary sm" href={link} target="_blank" rel="noreferrer noopener"><ExternalLink />{linkLabel(link)}</a>
          )}
        </div>
      )}
    </div>
  );
}
