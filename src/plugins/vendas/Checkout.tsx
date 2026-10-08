import { useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, CircleCheck, CreditCard, QrCode, ReceiptText, ShoppingBag, Store, Truck, WalletCards } from "lucide-react";
import { useDocument } from "@/core/store";
import { db, store } from "@/domain/db";
import { cartSummary, placeOrder, useCart, useCustomer } from "@/domain/services";
import type { Address, Order } from "@/domain/types";
import { money } from "@/core/format";
import { ProductArt } from "@/ui/ProductArt";
import { Pulse } from "@/ui/Pulse";
import { TradeInSummary } from "@/site/TradeIn";

export function Checkout() {
  const { lines, coupon, tradeIn } = useCart();
  const info = useDocument(store);
  const customer = useCustomer();
  const [delivery, setDelivery] = useState<Order["delivery"]>("entrega");
  const [payment, setPayment] = useState<Order["payment"]>("pix");
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [address, setAddress] = useState<Address>(customer?.address ?? { street: "", district: "", city: "Barra do Garças", zip: "" });
  const [done, setDone] = useState<Order | null>(null);
  const summary = cartSummary(lines, coupon, delivery);
  const hasPhone = summary.rows.some((r) => r.product.category === "celulares");

  if (done)
    return (
      <div className="wrap checkout-done">
        <div className="done-card">
          <Pulse className="done-pulse" />
          <CircleCheck className="done-icon" />
          <h1>Pedido {done.code} confirmado!</h1>
          <p className="muted">
            {done.payment === "boleto"
              ? "Recebemos seu pedido. Vamos chamar você no WhatsApp para montar o boleto parcelado em até 18x."
              : done.tradeIn
              ? `Recebemos seu pedido. Vamos chamar você no WhatsApp para avaliar seu ${done.tradeIn.device} e abater o valor.`
              : done.payment === "pix"
                ? "Pagamento recebido. Já estamos separando tudo pra você."
                : "Recebemos seu pedido. Assim que o pagamento for confirmado, começamos a separação."}
          </p>
          <div className="row wrap" style={{ justifyContent: "center" }}>
            <Link to="/conta" className="btn primary">Acompanhar pedido</Link>
            <Link to="/loja" className="btn ghost">Continuar comprando</Link>
          </div>
        </div>
      </div>
    );

  if (!summary.rows.length)
    return (
      <div className="wrap empty" style={{ minHeight: "50vh" }}>
        <ShoppingBag />
        <p>Seu carrinho está vazio.</p>
        <Link className="btn primary" to="/loja">Ir para a vitrine</Link>
      </div>
    );

  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const buyer =
      customer ??
      db.customers.find((c) => c.email.toLowerCase() === guest.email.trim().toLowerCase()) ??
      db.customers.insert({ ...guest, email: guest.email.trim().toLowerCase(), address, marketing: false });
    setBusy(true);
    try {
      setDone(await placeOrder({ customer: buyer, payment, delivery, address }));
    } finally {
      setBusy(false);
    }
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="wrap">
      <nav className="crumbs dark"><Link to="/">Início</Link>/<span>Finalizar compra</span></nav>
      <form className="checkout" onSubmit={submit}>
        <div className="stack" style={{ gap: 20 }}>
          <section className="panel">
            <h3><span className="step">1</span>Seus dados</h3>
            {customer ? (
              <div className="who">
                <span className="avatar">{customer.name[0]}</span>
                <div>
                  <b>{customer.name}</b>
                  <span className="faint">{customer.email} · {customer.phone}</span>
                </div>
              </div>
            ) : (
              <div className="grid-2">
                <label className="field span-2"><span>Nome completo</span><input required value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} /></label>
                <label className="field"><span>E-mail</span><input required type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} /></label>
                <label className="field"><span>WhatsApp</span><input required value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} placeholder="(66) 9…" /></label>
                <p className="span-all faint">Já tem cadastro? <Link to="/conta" className="link">Entre na sua conta</Link></p>
              </div>
            )}
          </section>

          <section className="panel">
            <h3><span className="step">2</span>Entrega</h3>
            <div className="options">
              <label className={delivery === "entrega" ? "on" : ""}>
                <input type="radio" name="delivery" checked={delivery === "entrega"} onChange={() => setDelivery("entrega")} />
                <Truck />
                <div><b>Receber em casa</b><span className="faint">{summary.subtotal - summary.discount >= info.freeShippingFrom ? "Grátis" : money(19.9)} · até 2 dias úteis</span></div>
              </label>
              <label className={delivery === "retirada" ? "on" : ""}>
                <input type="radio" name="delivery" checked={delivery === "retirada"} onChange={() => setDelivery("retirada")} />
                <Store />
                <div><b>Retirar na loja</b><span className="faint">Grátis · {info.address}</span></div>
              </label>
            </div>
            {delivery === "entrega" && (
              <div className="grid-3" style={{ marginTop: 16 }}>
                <label className="field span-2"><span>Endereço</span><input required value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} placeholder="Rua e número" /></label>
                <label className="field"><span>CEP</span><input required value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} /></label>
                <label className="field"><span>Bairro</span><input required value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} /></label>
                <label className="field span-2"><span>Cidade</span><input required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} /></label>
              </div>
            )}
          </section>

          <section className="panel">
            <h3><span className="step">3</span>Pagamento</h3>
            <div className="options">
              {([
                ["pix", QrCode, "Pix", "aprovação na hora"],
                ["cartao", CreditCard, "Cartão de crédito", "até 12x com taxas baixas"],
                ...(hasPhone ? [["boleto", ReceiptText, "Boleto parcelado", "celulares novos em até 18x"] as const] : []),
                ["brasilcard", WalletCards, "Brasilcard", "aceitamos o cartão Brasilcard"],
                ["dinheiro", Banknote, "Na entrega", "dinheiro ou cartão"],
              ] as const).map(([id, Icon, label, hint]) => (
                <label key={id} className={payment === id ? "on" : ""}>
                  <input type="radio" name="payment" checked={payment === id} onChange={() => setPayment(id)} />
                  <Icon />
                  <div><b>{label}</b><span className="faint">{hint}</span></div>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="panel summary">
          <h3>Resumo</h3>
          <ul className="summary-lines">
            {summary.rows.map(({ product, line }) => (
              <li key={`${line.productId}-${line.color}`}>
                <div className="thumb sm" style={{ "--tint": line.color ?? product.color } as React.CSSProperties}>
                  <ProductArt category={product.category} color={line.color ?? product.color} imageUrl={product.imageUrl} />
                  <em>{line.qty}</em>
                </div>
                <span>{product.name}</span>
                <b className="tabular">{money(product.price * line.qty)}</b>
              </li>
            ))}
          </ul>
          {tradeIn && <TradeInSummary tradeIn={tradeIn} />}
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{money(summary.subtotal)}</dd></div>
            {summary.discount > 0 && <div className="discount"><dt>Cupom {summary.promo?.coupon}</dt><dd>-{money(summary.discount)}</dd></div>}
            <div><dt>Frete</dt><dd>{summary.shipping ? money(summary.shipping) : "Grátis"}</dd></div>
            <div className="grand"><dt>Total</dt><dd>{money(summary.total)}</dd></div>
          </dl>
          <button className="btn primary lg block" disabled={busy}>{busy ? "Enviando…" : "Confirmar pedido"}</button>
          <p className="faint secure">Ambiente seguro · seus dados ficam só com a gente</p>
        </aside>
      </form>
    </div>
  );
}
