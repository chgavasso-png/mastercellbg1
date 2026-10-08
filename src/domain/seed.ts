import type {
  Customer, Expense, InstaPost, Order, OrderStatus, Product, Promotion, Purchase, Repair, Shipment, Channel, Payment,
} from "./types";

const rand = (() => {
  let s = 20261008;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();

const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
const daysAgo = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(rand() * 59));
  return d.toISOString();
};
const id = (prefix: string, n: number) => `${prefix}${n.toString().padStart(3, "0")}`;

type ProductRow = [string, string, Product["category"], number, number | undefined, number, number, string, string[] | undefined, string, boolean];

const productRows: ProductRow[] = [
  ["iPhone 16 Pro 256GB", "Apple", "celulares", 8999, 9799, 7100, 6, "#b9a48b", ["#b9a48b", "#2f2f33", "#e8e4dc"], "Titânio, câmera de 48 MP com zoom 5x e chip A18 Pro.", true],
  ["Galaxy S25 Ultra", "Samsung", "celulares", 7499, 8299, 5900, 4, "#3c3f4a", ["#3c3f4a", "#a7b3c2", "#d8c9b4"], "S Pen integrada, tela de 6,9 polegadas e câmera de 200 MP.", true],
  ["Redmi Note 14 Pro", "Xiaomi", "celulares", 1899, 2199, 1350, 12, "#7c5cbf", ["#7c5cbf", "#1f2a44"], "Tela AMOLED 120 Hz e carregamento de 67 W.", false],
  ["Moto G85 5G", "Motorola", "celulares", 1499, 1799, 1050, 9, "#2f6f73", ["#2f6f73", "#8fa3c8"], "Tela curva pOLED, som Dolby Atmos e 256 GB.", false],
  ["Capinha MagSafe Glitter", "MasterCell", "capinhas", 89.9, 119.9, 22, 40, "#fcd404", ["#fcd404", "#f0a6c3", "#d6c2f0"], "Brilho que não descasca, compatível com MagSafe.", true],
  ["Capinha Couro Caramelo", "MasterCell", "capinhas", 129.9, undefined, 38, 25, "#b5733f", ["#b5733f", "#3a2a22"], "Couro sintético premium com acabamento costurado.", true],
  ["Capinha Anti-impacto Clear", "MasterCell", "capinhas", 59.9, 79.9, 12, 60, "#d8e6ee", undefined, "Transparente que não amarela, cantos reforçados.", false],
  ["Capinha Neon Navy", "MasterCell", "capinhas", 69.9, undefined, 15, 35, "#131f7b", ["#131f7b", "#9ca4d0"], "Azul profundo com borda neon que brilha no escuro.", true],
  ["Película Privacidade 3D", "MasterCell", "peliculas", 49.9, 69.9, 8, 80, "#2a2a2e", undefined, "Ninguém espia sua tela. Vidro 9H com bordas 3D.", false],
  ["Carregador Turbo 35W USB-C", "Baseus", "carregadores", 149.9, 189.9, 62, 22, "#f2f2f2", ["#f2f2f2", "#222222"], "Dois cabos, um carregador. GaN compacto.", false],
  ["Power Bank MagSafe 10.000", "Anker", "carregadores", 279.9, 329.9, 140, 3, "#c8d3e0", ["#c8d3e0", "#efe6dd"], "Encaixa magneticamente e carrega sem fio.", true],
  ["Fone Bluetooth Bubble", "JBL", "fones", 349.9, 429.9, 190, 18, "#ffd2df", ["#ffd2df", "#ffffff", "#1d1d1f"], "Cancelamento de ruído e 40 h de bateria.", true],
  ["Cordão Phone Strap Pérolas", "MasterCell", "acessorios", 39.9, undefined, 7, 50, "#efe2d0", ["#efe2d0", "#f0a6c3"], "Leve seu celular no ombro, com estilo.", false],
  ["Pop Socket Espelho", "MasterCell", "acessorios", 29.9, 39.9, 5, 70, "#e7c4d9", undefined, "Suporte e espelhinho de bolso ao mesmo tempo.", false],
];

export const seedProducts = (): Product[] =>
  productRows.map(([name, brand, category, price, comparePrice, cost, stock, color, colors, description, featured], i) => ({
    id: id("p", i + 1),
    createdAt: new Date(Date.now() - (200 - i * 6) * 864e5).toISOString(),
    name, brand, category, price, comparePrice, cost, stock, color, colors,
    description, featured, active: true, tags: [],
  }));

const people = [
  ["Ana Beatriz Souza", "ana.souza@email.com", "(66) 98811-2034"],
  ["Lucas Martins", "lucas.m@email.com", "(66) 97722-1188"],
  ["Juliana Prado", "ju.prado@email.com", "(66) 99654-0021"],
  ["Rafael Lima", "rafa.lima@email.com", "(66) 98123-4455"],
  ["Mariana Costa", "mari.costa@email.com", "(66) 99901-7766"],
  ["Pedro Henrique", "pedroh@email.com", "(66) 98432-9090"],
  ["Camila Rocha", "camila.rocha@email.com", "(66) 97654-3321"],
  ["Bruno Alves", "bruno.alves@email.com", "(66) 99212-6543"],
] as const;

export const seedCustomers = (): Customer[] =>
  people.map(([name, email, phone], i) => ({
    id: id("c", i + 1),
    createdAt: new Date(Date.now() - (190 - i * 20) * 864e5).toISOString(),
    name, email, phone,
    address: { street: `Av. Min. João Alberto, ${100 + i * 17}`, district: "Centro", city: "Barra do Garças", zip: "01000-000" },
    marketing: i % 3 !== 0,
  }));

let orderCache: Order[] | undefined;

export const seedOrders = (): Order[] => {
  if (orderCache) return structuredClone(orderCache);
  const products = seedProducts();
  const customers = seedCustomers();
  const phones = products.filter((x) => x.category === "celulares");
  const extras = products.filter((x) => x.category !== "celulares");
  const channels: Channel[] = ["site", "site", "loja", "instagram", "whatsapp"];
  const payments: Payment[] = ["pix", "pix", "cartao", "cartao", "dinheiro"];
  const orders: Order[] = [];

  for (let n = 0; n < 110; n++) {
    const age = Math.floor((n / 110) ** 1.15 * 178);
    const lines = 1 + Math.floor(rand() * 2.4);
    const items = Array.from({ length: lines }, () => {
      const p = rand() > 0.8 ? pick(phones) : pick(extras);
      return { productId: p.id, name: p.name, price: p.price, cost: p.cost, qty: p.category === "celulares" ? 1 : 1 + Math.floor(rand() * 2) };
    });
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const delivery = rand() > 0.45 ? "entrega" : "retirada";
    const shipping = delivery === "entrega" ? (subtotal > 299 ? 0 : 19.9) : 0;
    const customer = pick(customers);
    const status: OrderStatus =
      age < 2 ? pick(["pendente", "pago", "separacao"] as const)
      : age < 6 ? pick(["separacao", "enviado", "entregue"] as const)
      : rand() > 0.94 ? "cancelado" : "entregue";

    orders.push({
      id: id("o", n + 1),
      createdAt: daysAgo(age, 9 + Math.floor(rand() * 10)),
      code: `#${1000 + 110 - n}`,
      customerId: customer.id,
      customerName: customer.name,
      items, subtotal, discount: 0, shipping, total: subtotal + shipping,
      status, payment: pick(payments), channel: pick(channels), delivery,
      address: delivery === "entrega" ? customer.address : undefined,
    });
  }
  orderCache = orders;
  return structuredClone(orders);
};

export const seedShipments = (): Shipment[] =>
  seedOrders()
    .filter((o) => o.delivery === "entrega" && ["pago", "separacao", "enviado", "entregue"].includes(o.status))
    .slice(0, 14)
    .map((o, i) => ({
      id: id("s", i + 1),
      createdAt: o.createdAt,
      orderId: o.id,
      orderCode: o.code,
      customerName: o.customerName,
      carrier: i % 3 === 0 ? "Motoboy" : "Correios",
      tracking: o.status === "pago" || o.status === "separacao" ? undefined : `BR${48213000 + i * 731}MT`,
      status: o.status === "entregue" ? "entregue" : o.status === "enviado" ? "transito" : "aguardando",
      address: o.address,
      cost: i % 3 === 0 ? 12 : 22.5,
      eta: new Date(Date.now() + 3 * 864e5).toISOString(),
    }));

export const seedPurchases = (): Purchase[] => {
  const p = seedProducts();
  const rows: { supplier: string; items: [Product, number][]; age: number; received: boolean }[] = [
    { supplier: "Distribuidora Tech SP", items: [[p[4], 30], [p[5], 20], [p[7], 25]], age: 40, received: true },
    { supplier: "Apple Revenda Autorizada", items: [[p[0], 4], [p[1], 3]], age: 22, received: true },
    { supplier: "Acessórios Brás", items: [[p[8], 50], [p[12], 40], [p[13], 40]], age: 9, received: true },
    { supplier: "Anker Brasil", items: [[p[10], 10], [p[9], 12]], age: 2, received: false },
  ];
  return rows.map((row, i) => {
    const items = row.items.map(([prod, qty]) => ({ productId: prod.id, name: prod.name, qty, cost: prod.cost }));
    return {
      id: id("b", i + 1),
      createdAt: daysAgo(row.age),
      supplier: row.supplier,
      items,
      total: items.reduce((s, it) => s + it.qty * it.cost, 0),
      status: row.received ? "recebido" : "pedido",
      expectedAt: daysAgo(row.age - 5),
      receivedAt: row.received ? daysAgo(row.age - 4) : undefined,
    };
  });
};

export const seedExpenses = (): Expense[] =>
  Array.from({ length: 6 })
    .flatMap((_, m) => [
      { description: "Aluguel da loja", category: "aluguel" as const, amount: 3200, age: m * 30 + 5 },
      { description: "Anúncios Instagram", category: "marketing" as const, amount: 450 + Math.round(rand() * 400), age: m * 30 + 12 },
      { description: "Equipe", category: "pessoal" as const, amount: 4100, age: m * 30 + 1 },
      { description: "Taxas de maquininha", category: "taxas" as const, amount: 280 + Math.round(rand() * 220), age: m * 30 + 20 },
    ])
    .map((e, i) => {
      const date = daysAgo(e.age);
      return { id: id("e", i + 1), createdAt: date, date, description: e.description, category: e.category, amount: e.amount };
    });

type RepairRow = [string, string, Repair["kind"], string, string, string, Repair["status"], number | undefined];

export const seedRepairs = (): Repair[] =>
  (
    [
      ["Ana Beatriz Souza", "(66) 98811-2034", "celular", "iPhone 13", "Tela quebrada", "Caiu da bolsa, touch funcionando parcialmente.", "reparo", 899],
      ["Rafael Lima", "(66) 98123-4455", "notebook", "Dell Inspiron 15", "Lento / travando", "Demora muito para ligar e abrir programas.", "orcamento", undefined],
      ["Camila Rocha", "(66) 97654-3321", "celular", "iPhone 11", "Conector de carga", "Só carrega em uma posição do cabo.", "pronto", 219],
      ["Bruno Alves", "(66) 99212-6543", "computador", "PC gamer", "Não liga", "Desligou durante uma queda de energia.", "recebido", undefined],
      ["Juliana Prado", "(66) 99654-0021", "tablet", "iPad 9ª geração", "Tela quebrada", "Vidro trincado no canto.", "entregue", 640],
    ] as RepairRow[]
  ).map(([customerName, phone, kind, device, issue, details, status, quote], i) => ({
    id: id("r", i + 1),
    createdAt: daysAgo(i * 3 + 1),
    protocol: `OS-${2410 + i}`,
    customerName, phone, kind, device, issue, details, status, quote,
    pickup: i % 2 ? "coleta" : "loja",
  }));

const tones = ["#fcd404", "#b5733f", "#9ca4d0", "#ffd2df", "#c8d3e0", "#131f7b"];

export const seedPosts = (): InstaPost[] =>
  (
    [
      ["Chegou a coleção Glitter ✨ qual cor é a sua?", "p005"],
      ["Couro caramelo combina com tudo 🤎", "p006"],
      ["Capinha Neon Navy: brilha no escuro 🌙", "p008"],
      ["Bubble em rosa bebê = amor 💗", "p012"],
      ["Power bank que gruda no celular? Sim! 🔋", "p011"],
      ["iPhone 16 Pro com condição especial no Pix 📱", "p001"],
    ] as const
  ).map(([caption, productId], i) => ({
    id: id("i", i + 1),
    createdAt: daysAgo(i * 4),
    caption, productId, tone: tones[i % tones.length],
    likes: 180 + Math.floor(rand() * 900),
    pinned: i < 2, active: true,
  }));

export const seedPromotions = (): Promotion[] => [
  {
    id: "pr001",
    createdAt: daysAgo(3),
    title: "Primeira compra?",
    message: "Ganhe 10% OFF em todo o carrinho usando o cupom abaixo.",
    coupon: "MASTER10",
    discount: 10,
    active: true,
    startsAt: daysAgo(3),
    endsAt: daysAgo(-27),
    delay: 4,
    cta: "Ver capinhas",
    link: "/loja?categoria=capinhas",
  },
  {
    id: "pr002",
    createdAt: daysAgo(40),
    title: "Black Master",
    message: "Até 30% OFF em toda a loja. Só no fim de semana!",
    coupon: "BLACK30",
    discount: 30,
    active: false,
    startsAt: daysAgo(-40),
    endsAt: daysAgo(-43),
    delay: 2,
    cta: "Aproveitar",
    link: "/loja",
  },
];
