import type { OrderStatus, RepairStatus, ShipmentStatus } from "@/domain/types";

export type Tone = "ok" | "warn" | "bad" | "info" | "brand" | "";

export const orderStatus: Record<OrderStatus, { label: string; tone: Tone }> = {
  pendente: { label: "Aguardando pagamento", tone: "warn" },
  pago: { label: "Pago", tone: "info" },
  separacao: { label: "Em separação", tone: "brand" },
  enviado: { label: "Enviado", tone: "info" },
  entregue: { label: "Entregue", tone: "ok" },
  cancelado: { label: "Cancelado", tone: "bad" },
};

export const repairStatus: Record<RepairStatus, { label: string; tone: Tone }> = {
  recebido: { label: "Recebido", tone: "" },
  orcamento: { label: "Em orçamento", tone: "warn" },
  aprovado: { label: "Aprovado", tone: "info" },
  reparo: { label: "Em reparo", tone: "brand" },
  pronto: { label: "Pronto p/ retirada", tone: "ok" },
  entregue: { label: "Entregue", tone: "ok" },
};

export const shipmentStatus: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  aguardando: { label: "Aguardando coleta", tone: "warn" },
  postado: { label: "Postado", tone: "info" },
  transito: { label: "Em trânsito", tone: "brand" },
  entregue: { label: "Entregue", tone: "ok" },
};

export function Status<T extends string>({ map, value }: { map: Record<T, { label: string; tone: Tone }>; value: T }) {
  const s = map[value];
  return <span className={`pill ${s?.tone ?? ""}`}>{s?.label ?? value}</span>;
}
