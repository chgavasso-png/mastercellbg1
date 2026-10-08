import { useEffect, useSyncExternalStore } from "react";
import { useCollection } from "@/core/store";
import { money } from "@/core/format";
import { db } from "@/domain/db";
import type { Customer, Order, Repair } from "@/domain/types";
import { orderStatus, repairStatus } from "./status";
import { toast } from "./Toast";

export type Note = { id: string; text: string; to: string; at: string; read: boolean };

/**
 * Notificações sem tabela nova: guardamos no navegador a última versão vista de cada
 * OS/pedido e avisamos o que mudou desde então — ao vivo (realtime) ou na próxima visita.
 */
type Memory = { since: string; seen: Record<string, string>; notes: Note[] };

const KEY = (who: string) => `master:notes:${who}`;
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

type Change = { key: string; sig: string; created: string; text?: string; to: string };

/** Compara com o que já foi visto e gera as notificações novas. */
function digest(who: string, changes: Change[], isNew: (c: Change) => string | undefined) {
  const memory = memoryFor(who);
  const fresh: Note[] = [];
  const seen = { ...memory.seen };
  for (const c of changes) {
    const before = seen[c.key];
    seen[c.key] = c.sig;
    if (before === c.sig) continue;
    const text = before === undefined ? (c.created > memory.since ? isNew(c) : undefined) : c.text;
    if (text) fresh.push({ id: `${c.key}:${c.sig}:${Date.now()}`, text, to: c.to, at: new Date().toISOString(), read: false });
  }
  if (!fresh.length && Object.keys(seen).length === Object.keys(memory.seen).length && Object.entries(seen).every(([k, v]) => memory.seen[k] === v)) return;
  update(who, (m) => ({ ...m, seen, notes: [...fresh.reverse(), ...m.notes].slice(0, MAX) }));
  fresh.forEach(alert);
}

const repairText = (r: Repair) => {
  if (r.status === "pronto") return `${r.protocol} · ${r.device} está pronto para retirada!`;
  if (r.status === "orcamento" && r.quote) return `${r.protocol} · orçamento de ${money(r.quote)} disponível. Toque para aceitar ou recusar.`;
  return `${r.protocol} · ${r.device}: ${repairStatus[r.status].label}`;
};

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
          key: `r:${r.id}`, sig: `${r.status}|${r.quote ?? ""}`, created: r.createdAt, text: repairText(r), to: "/conta?aba=assistencia",
        })),
        ...orders.filter((o) => o.customerId === customer.id).map((o) => ({
          key: `o:${o.id}`, sig: o.status, created: o.createdAt, text: `Pedido ${o.code}: ${orderStatus[o.status].label}`, to: "/conta?aba=pedidos",
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
          text: r.answer ? `${r.customerName} ${r.answer === "aceito" ? "aceitou" : "recusou"} o orçamento da ${r.protocol}` : undefined,
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
