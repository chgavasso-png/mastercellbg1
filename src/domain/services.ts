import { createDocument, isRemote, useDocument } from "@/core/store";
import { nextNumber, reloadAll, remote } from "@/core/remote";
import { events } from "@/core/events";
import { hash } from "@/core/format";
import { db, session, store } from "./db";
import type { Address, Customer, Order, OrderStatus, Promotion, Purchase, Repair, TradeIn } from "./types";

export type CartLine = { productId: string; qty: number; color?: string };

export const cart = createDocument<{ lines: CartLine[]; coupon?: string; tradeIn?: TradeIn; open: boolean }>("cart", { lines: [], open: false });

export const tradeOffer = createDocument<{ line?: CartLine }>("trade-offer", {});

export const useCart = () => useDocument(cart);

export function addToCart(productId: string, color?: string, qty = 1) {
  const { lines } = cart.get();
  const found = lines.find((l) => l.productId === productId && l.color === color);
  cart.set({
    open: true,
    lines: found
      ? lines.map((l) => (l === found ? { ...l, qty: l.qty + qty } : l))
      : [...lines, { productId, color, qty }],
  });
}

export function buy(productId: string, color?: string, qty = 1) {
  const product = db.products.get(productId);
  if (product?.category === "celulares" && !cart.get().tradeIn) {
    tradeOffer.set({ line: { productId, color, qty } });
    return false;
  }
  addToCart(productId, color, qty);
  return true;
}

export const tradeConditions: Record<TradeIn["condition"], { label: string; hint: string }> = {
  otimo: { label: "Ótimo", hint: "sem riscos, tudo funcionando" },
  bom: { label: "Bom", hint: "riscos leves de uso" },
  marcas: { label: "Com marcas", hint: "arranhões ou amassados visíveis" },
  defeito: { label: "Quebrado / com defeito", hint: "tela trincada, não liga, peça com problema" },
};

export function setQty(index: number, qty: number) {
  const lines = [...cart.get().lines];
  if (qty <= 0) lines.splice(index, 1);
  else lines[index] = { ...lines[index], qty };
  const hasPhone = lines.some((l) => db.products.get(l.productId)?.category === "celulares");
  cart.set({ lines, tradeIn: hasPhone ? cart.get().tradeIn : undefined });
}

export const activePromotion = (now = new Date()) =>
  db.promotions
    .all()
    .find((p) => p.active && new Date(p.startsAt) <= now && new Date(p.endsAt) >= now);

export const findCoupon = (code?: string): Promotion | undefined =>
  code ? db.promotions.all().find((p) => p.active && p.coupon.toUpperCase() === code.trim().toUpperCase()) : undefined;

export function cartSummary(lines = cart.get().lines, coupon = cart.get().coupon, delivery: Order["delivery"] = "entrega") {
  const rows = lines
    .map((line) => ({ line, product: db.products.get(line.productId) }))
    .filter((r): r is { line: CartLine; product: NonNullable<typeof r.product> } => Boolean(r.product));
  const subtotal = rows.reduce((s, r) => s + r.product.price * r.line.qty, 0);
  const promo = findCoupon(coupon);
  const discount = promo ? Math.round(subtotal * promo.discount) / 100 : 0;
  const shipping = delivery === "retirada" || subtotal - discount >= store.get().freeShippingFrom || !rows.length ? 0 : 19.9;
  return { rows, subtotal, discount, shipping, total: subtotal - discount + shipping, promo, count: rows.reduce((s, r) => s + r.line.qty, 0) };
}

const nextCode = async () => {
  const number = await nextNumber("order");
  if (number) return `#${number}`;
  const max = db.orders.all().reduce((m, o) => Math.max(m, Number(o.code.replace("#", "")) || 0), 1000);
  return `#${max + 1}`;
};

export async function placeOrder(input: {
  customer: Customer;
  payment: Order["payment"];
  delivery: Order["delivery"];
  address?: Address;
  channel?: Order["channel"];
}) {
  const { lines, coupon, tradeIn } = cart.get();
  const summary = cartSummary(lines, coupon, input.delivery);
  const confirmed = !isRemote() && input.payment === "pix" && !tradeIn;
  const order = db.orders.insert({
    code: await nextCode(),
    customerId: input.customer.id,
    customerName: input.customer.name,
    items: summary.rows.map(({ product, line }) => ({
      productId: product.id,
      name: product.name,
      price: product.price,
      cost: product.cost,
      qty: line.qty,
    })),
    subtotal: summary.subtotal,
    discount: summary.discount,
    shipping: summary.shipping,
    total: summary.total,
    status: confirmed ? "pago" : "pendente",
    payment: input.payment,
    channel: input.channel ?? "site",
    delivery: input.delivery,
    address: input.delivery === "entrega" ? input.address : undefined,
    coupon: summary.promo?.coupon,
    tradeIn,
  });

  summary.rows.forEach(({ product, line }) => {
    const stock = Math.max(0, product.stock - line.qty);
    if (isRemote()) db.products.patchLocal(product.id, { stock });
    else db.products.update(product.id, { stock });
  });
  cart.set({ lines: [], coupon: undefined, tradeIn: undefined, open: false });
  events.emit("order:created", order);
  if (order.status === "pago") events.emit("order:status", { order, previous: "pendente" });
  return order;
}

export function setOrderStatus(id: string, status: OrderStatus) {
  const previous = db.orders.get(id)?.status;
  const order = db.orders.update(id, { status });
  if (order && previous && previous !== status) {
    if (status === "cancelado") order.items.forEach((i) => {
      const p = db.products.get(i.productId);
      if (p) db.products.update(p.id, { stock: p.stock + i.qty });
    });
    events.emit("order:status", { order, previous });
  }
  return order;
}

export function evaluateTradeIn(id: string, value: number) {
  const order = db.orders.get(id);
  if (!order?.tradeIn) return;
  const previous = order.tradeIn.value ?? 0;
  const discount = Math.max(0, order.discount - previous + value);
  return db.orders.update(id, {
    tradeIn: { ...order.tradeIn, value },
    discount,
    total: Math.max(0, order.subtotal - discount + order.shipping),
  });
}

export function receivePurchase(purchase: Purchase) {
  purchase.items.forEach((item) => {
    const p = db.products.get(item.productId);
    if (p) db.products.update(p.id, { stock: p.stock + item.qty, cost: item.cost });
  });
  const updated = db.purchases.update(purchase.id, { status: "recebido", receivedAt: new Date().toISOString() });
  if (updated) events.emit("purchase:received", updated);
}

export async function requestRepair(data: Omit<Repair, "id" | "createdAt" | "protocol" | "status">) {
  const number = (await nextNumber("repair")) ?? db.repairs.all().reduce((m, r) => Math.max(m, Number(r.protocol.replace("OS-", "")) || 0), 2400) + 1;
  const repair = db.repairs.insert({ ...data, protocol: `OS-${number}`, status: "recebido" });
  events.emit("repair:created", repair);
  return repair;
}

/** Cliente aceita ou recusa o orçamento. Pelo protocolo, para funcionar também sem login. */
export async function answerQuote(protocol: string, accept: boolean) {
  const answer = accept ? ("aceito" as const) : ("recusado" as const);
  const patch = accept ? { answer, status: "aprovado" as const } : { answer };
  const repair = db.repairs.find((r) => r.protocol === protocol);
  if (remote) {
    const { error } = await remote.rpc("answer_quote", { code: protocol, accept });
    if (error) throw new Error(error.message);
    if (repair) db.repairs.patchLocal(repair.id, patch);
  } else if (repair) db.repairs.update(repair.id, patch);
  return patch;
}

const authMessages: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha não conferem.",
  "User already registered": "Esse e-mail já tem cadastro. Que tal entrar?",
  "Email not confirmed": "Confirme seu e-mail antes de entrar — enviamos um link para você.",
};

const authError = (message: string) => new Error(authMessages[message] ?? message);

export async function registerCustomer(data: Omit<Customer, "id" | "createdAt" | "passwordHash"> & { password: string }) {
  const email = data.email.trim().toLowerCase();
  const { password, ...rest } = data;

  if (remote) {
    const { data: res, error } = await remote.auth.signUp({ email, password, options: { data: { customer: { ...rest, email } }, emailRedirectTo: `${window.location.origin}/conta` } });
    if (error) throw authError(error.message);
    if (!res.session || !res.user) return null;
    session.set({ customerId: res.user.id });
    await reloadAll();
    const customer = db.customers.get(res.user.id);
    if (customer) events.emit("customer:registered", customer);
    return customer ?? null;
  }

  if (db.customers.find((c) => c.email.toLowerCase() === email && Boolean(c.passwordHash)))
    throw new Error(authMessages["User already registered"]);
  const passwordHash = await hash(password);
  const existing = db.customers.find((c) => c.email.toLowerCase() === email);
  const customer = existing
    ? db.customers.update(existing.id, { ...rest, email, passwordHash })!
    : db.customers.insert({ ...rest, email, passwordHash });
  session.set({ customerId: customer.id });
  events.emit("customer:registered", customer);
  return customer;
}

export type Role = "admin" | "customer";

/** Conta criada direto no Supabase (sem o formulário do site) não tem ficha de cliente: cria uma mínima. */
function ensureCustomer(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  if (db.customers.get(user.id)) return;
  const email = user.email ?? "";
  const meta = (user.user_metadata?.customer ?? {}) as Partial<Customer>;
  db.customers.insert({ name: email.split("@")[0], phone: "", marketing: false, ...meta, email, id: user.id });
}

const LOCAL_ADMIN = { email: "admin@mastter.cell", password: "mastter123" };

/** Login único: descobre se a conta é de administrador ou de cliente e abre a sessão certa. */
export async function signIn(email: string, password: string): Promise<Role> {
  if (remote) {
    const { data, error } = await remote.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw authError(error.message);
    const { data: allowed } = await remote.rpc("is_admin");
    session.set(allowed ? { admin: true, adminEmail: data.user.email, customerId: undefined } : { admin: false, adminEmail: undefined, customerId: data.user.id });
    await reloadAll();
    if (!allowed) ensureCustomer(data.user);
    return allowed ? "admin" : "customer";
  }
  if (email.trim().toLowerCase() === LOCAL_ADMIN.email && password === LOCAL_ADMIN.password) {
    session.set({ admin: true, adminEmail: LOCAL_ADMIN.email, customerId: undefined });
    return "admin";
  }
  const customer = db.customers.find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
  if (!customer?.passwordHash || customer.passwordHash !== (await hash(password)))
    throw new Error(authMessages["Invalid login credentials"]);
  session.set({ admin: false, adminEmail: undefined, customerId: customer.id });
  return "customer";
}

export async function signOut() {
  session.set({ customerId: undefined, admin: false, adminEmail: undefined });
  if (remote) {
    await remote.auth.signOut();
    await reloadAll();
  }
}

export function watchAuth() {
  if (!remote) return;
  const client = remote;
  client.auth.onAuthStateChange((event, auth) => {
    if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !auth)) {
      session.set({ customerId: undefined, admin: false, adminEmail: undefined });
      return;
    }
    if (event !== "INITIAL_SESSION" || !auth) return;
    setTimeout(async () => {
      const { data: allowed } = await client.rpc("is_admin");
      session.set(allowed ? { admin: true, adminEmail: auth.user.email, customerId: undefined } : { admin: false, customerId: auth.user.id });
      await reloadAll();
      if (!allowed) ensureCustomer(auth.user);
    });
  });
}

export const useCustomer = () => {
  const { customerId } = useDocument(session);
  return customerId ? db.customers.get(customerId) : undefined;
};
