import type { Order, Repair, Customer, Purchase } from "@/domain/types";

export interface EventMap {
  "order:created": Order;
  "order:status": { order: Order; previous: Order["status"] };
  "repair:created": Repair;
  "customer:registered": Customer;
  "purchase:received": Purchase;
}

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

const handlers = new Map<keyof EventMap, Set<Handler<any>>>();

export const events = {
  on<K extends keyof EventMap>(event: K, handler: Handler<K>) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(handler);
    return () => handlers.get(event)!.delete(handler);
  },
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    handlers.get(event)?.forEach((h) => h(payload));
  },
};
