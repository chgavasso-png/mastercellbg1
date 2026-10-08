import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Tag, X, Truck } from "lucide-react";
import { cart, cartSummary, findCoupon, setQty, useCart } from "@/domain/services";
import { store } from "@/domain/db";
import { money } from "@/core/format";
import { ProductArt } from "@/ui/ProductArt";
import { TradeInSummary } from "./TradeIn";

export function CartDrawer() {
  const state = useCart();
  const navigate = useNavigate();
  const [code, setCode] = useState(state.coupon ?? "");
  const [error, setError] = useState("");
  const summary = cartSummary(state.lines, state.coupon);
  const freeFrom = store.get().freeShippingFrom;
  const missing = Math.max(0, freeFrom - (summary.subtotal - summary.discount));
  const close = () => cart.set({ open: false });

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.open]);

  const apply = () => {
    if (!code.trim()) return cart.set({ coupon: undefined });
    if (!findCoupon(code)) return setError("Cupom inválido ou expirado");
    setError("");
    cart.set({ coupon: code.trim().toUpperCase() });
  };

  return createPortal(
    <div className={`drawer-wrap${state.open ? " open" : ""}`} aria-hidden={!state.open}>
      <div className="drawer-backdrop" onClick={close} />
      <aside className="drawer" role="dialog" aria-label="Carrinho">
        <header>
          <h3>Seu carrinho <span className="faint">({summary.count})</span></h3>
          <button className="icon-btn" onClick={close} aria-label="Fechar"><X /></button>
        </header>

        {summary.rows.length === 0 ? (
          <div className="empty">
            <ShoppingBag />
            <p>Seu carrinho está vazio.</p>
            <button className="btn primary" onClick={() => { close(); navigate("/loja"); }}>Explorar a vitrine</button>
          </div>
        ) : (
          <>
            <div className="ship-meter">
              <Truck />
              <div>
                <p>{missing > 0 ? <>Faltam <b>{money(missing)}</b> para frete grátis</> : <b>Você ganhou frete grátis!</b>}</p>
                <span><i style={{ width: `${Math.min(100, ((freeFrom - missing) / freeFrom) * 100)}%` }} /></span>
              </div>
            </div>

            <ul className="drawer-lines">
              {summary.rows.map(({ product, line }, i) => (
                <li key={`${line.productId}-${line.color}`}>
                  <div className="thumb" style={{ "--tint": line.color ?? product.color } as React.CSSProperties}>
                    <ProductArt category={product.category} color={line.color ?? product.color} imageUrl={product.imageUrl} />
                  </div>
                  <div>
                    <p className="line-name">{product.name}</p>
                    {line.color && <span className="line-color"><i style={{ background: line.color }} />cor selecionada</span>}
                    <div className="qty">
                      <button onClick={() => setQty(i, line.qty - 1)} aria-label="Diminuir"><Minus /></button>
                      <span>{line.qty}</span>
                      <button onClick={() => setQty(i, line.qty + 1)} aria-label="Aumentar"><Plus /></button>
                    </div>
                  </div>
                  <strong className="tabular">{money(product.price * line.qty)}</strong>
                </li>
              ))}
            </ul>

            <footer>
              {state.tradeIn && <TradeInSummary tradeIn={state.tradeIn} onRemove={() => cart.set({ tradeIn: undefined })} />}
              <div className="coupon">
                <Tag />
                <input className="input" placeholder="Cupom de desconto" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && apply()} />
                <button className="btn soft sm" onClick={apply}>Aplicar</button>
              </div>
              {error && <small className="error">{error}</small>}
              <dl className="totals">
                <div><dt>Subtotal</dt><dd>{money(summary.subtotal)}</dd></div>
                {summary.discount > 0 && <div className="discount"><dt>Cupom {summary.promo?.coupon}</dt><dd>-{money(summary.discount)}</dd></div>}
                <div className="grand"><dt>Total</dt><dd>{money(summary.subtotal - summary.discount)}</dd></div>
              </dl>
              <button className="btn primary lg block" onClick={() => { close(); navigate("/checkout"); }}>Finalizar compra</button>
            </footer>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
