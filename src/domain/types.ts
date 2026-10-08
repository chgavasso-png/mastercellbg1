import type { Entity } from "@/core/store";

export type Category = "celulares" | "capinhas" | "peliculas" | "carregadores" | "fones" | "acessorios";

export interface Product extends Entity {
  name: string;
  brand: string;
  category: Category;
  price: number;
  comparePrice?: number;
  cost: number;
  stock: number;
  color: string;
  colors?: string[];
  description: string;
  featured: boolean;
  active: boolean;
  imageUrl?: string;
  tags: string[];
}

export interface Address {
  street: string;
  district: string;
  city: string;
  zip: string;
}

export interface Customer extends Entity {
  name: string;
  email: string;
  phone: string;
  document?: string;
  birthday?: string;
  address?: Address;
  passwordHash?: string;
  marketing: boolean;
}

export type OrderStatus = "pendente" | "pago" | "separacao" | "enviado" | "entregue" | "cancelado";
export type Channel = "site" | "loja" | "instagram" | "whatsapp";
export type Payment = "pix" | "cartao" | "boleto" | "brasilcard" | "dinheiro";

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  cost: number;
  qty: number;
}

export interface TradeIn {
  device: string;
  storage: string;
  condition: "otimo" | "bom" | "marcas" | "defeito";
  battery?: number;
  notes?: string;
  value?: number;
}

export interface Order extends Entity {
  code: string;
  customerId?: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  payment: Payment;
  channel: Channel;
  delivery: "retirada" | "entrega";
  address?: Address;
  coupon?: string;
  tradeIn?: TradeIn;
}

export interface Purchase extends Entity {
  supplier: string;
  items: { productId: string; name: string; qty: number; cost: number }[];
  total: number;
  status: "pedido" | "recebido";
  expectedAt?: string;
  receivedAt?: string;
}

export interface Expense extends Entity {
  description: string;
  category: "aluguel" | "marketing" | "pessoal" | "frete" | "taxas" | "outros";
  amount: number;
  date: string;
}

export type ShipmentStatus = "aguardando" | "postado" | "transito" | "entregue";

export interface Shipment extends Entity {
  orderId: string;
  orderCode: string;
  customerName: string;
  carrier: "Correios" | "Motoboy" | "Jadlog" | "Retirada";
  tracking?: string;
  status: ShipmentStatus;
  address?: Address;
  cost: number;
  eta?: string;
}

export type DeviceKind = "celular" | "tablet" | "notebook" | "computador";

export type RepairStatus = "recebido" | "orcamento" | "aprovado" | "reparo" | "pronto" | "entregue";

export interface Repair extends Entity {
  protocol: string;
  customerId?: string;
  customerName: string;
  phone: string;
  email?: string;
  kind?: DeviceKind;
  device: string;
  issue: string;
  details: string;
  pickup: "loja" | "coleta";
  status: RepairStatus;
  quote?: number;
  note?: string;
}

export interface InstaPost extends Entity {
  caption: string;
  imageUrl?: string;
  tone: string;
  productId?: string;
  likes: number;
  pinned: boolean;
  active: boolean;
}

export interface Promotion extends Entity {
  title: string;
  message: string;
  coupon: string;
  discount: number;
  active: boolean;
  startsAt: string;
  endsAt: string;
  delay: number;
  cta: string;
  link: string;
}
