const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const month = new Intl.DateTimeFormat("pt-BR", { month: "short" });

export const money = (v: number) => brl.format(v);
export const short = (v: number) => compact.format(v);
export const day = (iso: string) => date.format(new Date(iso));
export const stamp = (iso: string) => dateTime.format(new Date(iso));
export const monthName = (d: Date) => month.format(d).replace(".", "");
export const percent = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;

export const slug = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const installments = (n = 12) => `em até ${n}x no cartão, com taxas baixas`;

export async function hash(text: string) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
