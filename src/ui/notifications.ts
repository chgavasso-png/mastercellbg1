import { useEffect, useSyncExternalStore } from "react";
import { useCollection } from "@/core/store";
import { day, money } from "@/core/format";
import { linkLabel, safeLink, slotLabel } from "@/core/delivery";
import { db } from "@/domain/db";
import type { Customer, Order, Repair } from "@/domain/types";
import { orderStatus, repairStatus, shipmentStatus } from "./status";
import { toast } from "./Toast";

export type Note = { id: string; text: string; to: string; at: string; read: boolean };

/**
 * Notificações sem tabela nova: guardamos no navegador a última versão vista de cada
 * OS/pedido e avisamos o que mudou desde então — ao vivo (realtime) ou na próxima visita.
 */
type Memory = { since: string; seen: Record<string, string>; notes: Note[] };

const KEY = (who: string) => `master:notes:v2:${who}`;
const MAX = 40;

function load(who: string): Memory {
  try {
    const raw = localStorage.getItem(KEY(who));
    if (raw) return JSON.parse(raw) as Memory;
  } catch {
    /* sem storage: começa do zero */
  }
  return { since: new Date().toISOString(), seen: {}, notes: [] };
}

function save(who: string, memory: Memory) {
  try {
    localStorage.setItem(KEY(who), JSON.stringify(memory));
  } catch {
    /* ignora */
  }
}

const listeners = new Set<() => void>();
let current: { who: string; memory: Memory } | null = null;
const emit = () => listeners.forEach((l) => l());

function memoryFor(who: string) {
  if (current?.who !== who) current = { who, memory: load(who) };
  return current.memory;
}

function update(who: string, fn: (m: Memory) => Memory) {
  const next = fn(memoryFor(who));
  current = { who, memory: next };
  save(who, next);
  emit();
}

function alert(note: Note) {
  toast(note.text);
  try {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden)
      new Notification("MasterCell", { body: note.text, icon: "/brand/icone.svg" });
  } catch {
    /* navegador sem suporte */
  }
}

/** `text` recebe a assinatura anterior, para dizer exatamente o que mudou. */
type Change = { key: string; sig: string; created: string; text?: (before: string) => string | undefined; to: string };

const SEP = "\u001f";
const sig = (...values: unknown[]) => values.map((v) => (v === undefined || v === null ? "" : String(v))).join(SEP);
const parts = (s: string) => s.split(SEP);

/** Compara com o que já foi visto e gera as notificações novas. */
function digest(who: string, changes: Change[], isNew: (c: Change) => string | undefined) {
  const memory = memoryFor(who);
  const fresh: Note[] = [];
  const seen = { ...memory.seen };
  for (const c of changes) {
    const before = seen[c.key];
    seen[c.key] = c.sig;
    if (before === c.sig) continue;
    const text = before === undefined ? (c.created > memory.since ? isNew(c) : undefined) : c.text?.(before);
    if (text) fresh.push({ id: `${c.key}:${c.sig}:${Date.now()}`, text, to: c.to, at: new Date().toISOString(), read: false });
  }
  if (!fresh.length && Object.keys(seen).length === Object.keys(memory.seen).length && Object.entries(seen).every(([k, v]) => memory.seen[k] === v)) return;
  update(who, (m) => ({ ...m, seen, notes: [...fresh.reverse(), ...m.notes].slice(0, MAX) }));
  fresh.forEach(alert);
}

const repairSig = (r: Repair) => sig(r.status, r.quote, r.note);

function repairText(r: Repair, before: string) {
  const [status, quote] = parts(before);
  const head = `${r.protocol} · ${r.device}`;
  if (status !== r.status) {
    if (r.status === "pronto") return `${head} está pronto para retirada!`;
    if (r.status === "orcamento" && r.quote) return `${head}: orçamento de ${money(r.quote)} disponível. Toque para aceitar ou recusar.`;
    return `${head}: ${repairStatus[r.status].label}`;
  }
  if (quote !== String(r.quote ?? "")) return r.quote ? `${head}: orçamento atualizado para ${money(r.quote)}` : `${head}: orçamento removido`;
  return r.note ? `${head}: nova observação da loja — "${r.note}"` : `${head}: a loja atualizou sua OS`;
}

const orderSig = (o: Order) =>
  sig(o.status, o.shipment?.status, o.shipment?.carrier, o.shipment?.tracking, o.shipment?.eta, o.tradeIn?.value, slotLabel(o.shipment?.slot), o.shipment?.link);

function orderText(o: Order, before: string) {
  const [status, shipStatus, carrier, tracking, eta, tradeValue, slot = "", link = ""] = parts(before);
  const head = `Pedido ${o.code}`;
  const s = o.shipment;
  if (status !== o.status) {
    if (o.status === "entregue") return `${head} foi entregue. Obrigado pela compra!`;
    return `${head}: ${orderStatus[o.status].label}`;
  }
  const nowSlot = slotLabel(s?.slot);
  if (s && nowSlot && slot !== nowSlot) return `${head}: entrega agendada para ${nowSlot}`;
  const nowLink = safeLink(s?.link);
  if (nowLink && link !== (s?.link ?? "")) return `${head}: ${linkLabel(nowLink).toLowerCase()} — toque para abrir seu pedido`;
  if (s && shipStatus !== s.status) return `${head}: entrega — ${shipmentStatus[s.status].label}${s.carrier !== "Retirada" ? ` (${s.carrier})` : ""}`;
  if (s?.tracking && tracking !== s.tracking) return `${head}: código de rastreio ${s.tracking}`;
  if (s?.eta && eta !== s.eta) return `${head}: nova previsão de entrega ${day(s.eta)}`;
  if (s && carrier !== s.carrier) return `${head}: entrega agora por ${s.carrier}`;
  if (o.tradeIn?.value && tradeValue !== String(o.tradeIn.value)) return `${head}: seu ${o.tradeIn.device} foi avaliado em ${money(o.tradeIn.value)}`;
  return `${head}: a loja atualizou seu pedido`;
}

/** Cliente: avisa quando a loja muda o status das suas OS e pedidos. */
export function useCustomerNotifications(customer?: Customer) {
  const repairs = useCollection(db.repairs);
  const orders = useCollection(db.orders);

  useEffect(() => {
    if (!customer) return;
    const mine = (r: Repair) => r.customerId === customer.id || (r.phone && r.phone === customer.phone);
    digest(
      customer.id,
      [
        ...repairs.filter(mine).map((r) => ({
          key: `r:${r.id}`, sig: repairSig(r), created: r.createdAt, text: (before: string) => repairText(r, before), to: "/conta?aba=assistencia",
        })),
        ...orders.filter((o) => o.customerId === customer.id).map((o) => ({
          key: `o:${o.id}`, sig: orderSig(o), created: o.createdAt, text: (before: string) => orderText(o, before), to: "/conta?aba=pedidos",
        })),
      ],
      () => undefined, // o próprio cliente criou: não precisa avisar
    );
  }, [customer, repairs, orders]);

  return useNotes(customer?.id);
}

/** Admin: avisa novas OS, novos pedidos e respostas de orçamento. */
export function useAdminNotifications() {
  const repairs = useCollection(db.repairs);
  const orders = useCollection(db.orders);

  useEffect(() => {
    digest(
      "admin",
      [
        ...repairs.map((r) => ({
          key: `r:${r.id}`, sig: r.answer ?? "", created: r.createdAt, to: "/admin/assistencia",
          text: () => (r.answer ? `${r.customerName} ${r.answer === "aceito" ? "aceitou" : "recusou"} o orçamento da ${r.protocol}` : undefined),
          repair: r,
        })),
        ...orders.map((o: Order) => ({ key: `o:${o.id}`, sig: "", created: o.createdAt, to: "/admin/vendas", order: o })),
      ],
      (c) => {
        const { repair, order } = c as Change & { repair?: Repair; order?: Order };
        if (repair) return `Nova OS ${repair.protocol} · ${repair.device} (${repair.customerName})`;
        if (order) return `Novo pedido ${order.code} · ${money(order.total)} (${order.customerName})`;
      },
    );
  }, [repairs, orders]);

  return useNotes("admin");
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const EMPTY: Note[] = [];

function useNotes(who?: string) {
  const notes = useSyncExternalStore(subscribe, () => (who ? memoryFor(who).notes : EMPTY));
  return {
    notes,
    unread: notes.filter((n) => !n.read).length,
    markAllRead: () => who && update(who, (m) => ({ ...m, notes: m.notes.map((n) => ({ ...n, read: true })) })),
    clear: () => who && update(who, (m) => ({ ...m, notes: [] })),
  };
}

export function askBrowserPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
  } catch {
    /* ignora */
  }
}
