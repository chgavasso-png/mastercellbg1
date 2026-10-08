import { createCollection, createDocument, isRemote } from "@/core/store";
import * as seed from "./seed";
import type { Customer, Expense, InstaPost, Order, Product, Promotion, Purchase, Repair, Shipment } from "./types";

export const db = {
  products: createCollection<Product>("products", seed.seedProducts),
  customers: createCollection<Customer>("customers", seed.seedCustomers),
  orders: createCollection<Order>("orders", seed.seedOrders),
  purchases: createCollection<Purchase>("purchases", seed.seedPurchases),
  expenses: createCollection<Expense>("expenses", seed.seedExpenses),
  shipments: createCollection<Shipment>("shipments", seed.seedShipments),
  repairs: createCollection<Repair>("repairs", seed.seedRepairs),
  posts: createCollection<InstaPost>("posts", seed.seedPosts),
  promotions: createCollection<Promotion>("promotions", seed.seedPromotions),
};

export const store = createDocument("store", {
  name: "Mastter Cell",
  tagline: "Celulares e acessórios · assistência técnica em celulares, tablets, notebooks e computadores",
  instagram: "mastercellbg",
  phone: "(66) 99247-3929",
  whatsapp: "5566992473929",
  address: "R. Goiás, 881 · Centro, Barra do Garças · MT",
  hours: "Seg a Sex 8h às 18h · Sáb 8h às 12h",
  freeShippingFrom: 299,
}, { shared: true });

export const session = createDocument<{ customerId?: string; admin?: boolean; adminEmail?: string }>("session", {});

export const categories = [
  { id: "celulares", label: "Celulares" },
  { id: "capinhas", label: "Capinhas" },
  { id: "peliculas", label: "Películas" },
  { id: "carregadores", label: "Carregadores" },
  { id: "fones", label: "Fones" },
  { id: "acessorios", label: "Acessórios" },
] as const;

export const deviceKinds = [
  { id: "celular", label: "Celular", example: "Ex.: iPhone 13, Galaxy A54" },
  { id: "tablet", label: "Tablet", example: "Ex.: iPad 9ª geração, Galaxy Tab A8" },
  { id: "notebook", label: "Notebook", example: "Ex.: Dell Inspiron 15, Lenovo IdeaPad 3" },
  { id: "computador", label: "Computador", example: "Ex.: PC gamer, desktop de escritório" },
] as const;

export const deviceLabel = (id?: string) => deviceKinds.find((d) => d.id === id)?.label ?? "Celular";

export const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

export function resetAll() {
  const targets = isRemote() ? [db.products, db.promotions, db.posts] : Object.values(db);
  return Promise.all(targets.map((c) => c.reset()));
}
