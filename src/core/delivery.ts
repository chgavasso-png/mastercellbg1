import type { Shipment } from "@/domain/types";

/** "qua., 14/10 · 14:00–16:00" */
export function slotLabel(slot?: Shipment["slot"]) {
  if (!slot?.date) return "";
  const date = new Date(`${slot.date}T12:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  const hours = slot.from && slot.to ? `${slot.from}–${slot.to}` : slot.from ? `a partir das ${slot.from}` : slot.to ? `até ${slot.to}` : "";
  return hours ? `${date} · ${hours}` : date;
}

/** Só aceita http(s): o link vai para a tela do cliente. */
export function safeLink(link?: string) {
  const value = link?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** Nome amigável do link, pelo endereço. */
export function linkLabel(link: string) {
  const host = new URL(link).hostname.replace(/^www\./, "");
  if (/uber\./.test(host)) return "Acompanhar corrida na Uber";
  if (/99app|99\.co|99taxis/.test(host)) return "Acompanhar corrida na 99";
  if (/wa\.me|whatsapp/.test(host)) return "Ver localização no WhatsApp";
  if (/google\.|goo\.gl|maps\.app/.test(host)) return "Ver no mapa";
  return "Acompanhar entrega";
}
