import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CreditCard, Minus, Plus, ReceiptText, Repeat, ShieldCheck, ShoppingBag, Store, Truck, MessageCircle } from "lucide-react";
import { Slot } from "@/core/plugins";
import { useCollection, useDocument } from "@/core/store";
import { categoryLabel, db, store } from "@/domain/db";
import { buy } from "@/domain/services";
import { installments, money } from "@/core/format";
import { ProductArt } from "@/ui/ProductArt";
import { ProductCard } from "@/site/ProductCard";
import { toast } from "@/ui/Toast";

export function ProductPage() {
  const { id } = useParams();
  const products = useCollection(db.products);
  const info = useDocument(store);
  const product = products.find((p) => p.id === id);
  const [color, setColor] = useState<string>();
  const [qty, setQty] = useState(1);

  if (!product)
    return (
      <div className="wrap empty" style={{ minHeight: "50vh" }}>
        <p>Produto não encontrado.</p>
        <Link className="btn primary" to="/loja">Voltar para a vitrine</Link>
      </div>
    );

  const current = color ?? product.colors?.[0] ?? product.color;
  const off = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;
  const related = products.filter((p) => p.active && p.id !== product.id && p.category === product.category).slice(0, 4);
  const pix = product.price * 0.95;

  return (
    <div className="wrap">
      <nav className="crumbs dark">
        <Link to="/">Início</Link>/<Link to="/loja">Vitrine</Link>/
        <Link to={`/loja?categoria=${product.category}`}>{categoryLabel(product.category)}</Link>
      </nav>

      <div className="pdp">
        <div className="pdp-media" style={{ "--tint": current } as React.CSSProperties}>
          <ProductArt category={product.category} color={current} imageUrl={product.imageUrl} name={product.name} />
          {off > 0 && <span className="flag flag-off pdp-flag">-{off}%</span>}
        </div>

        <div className="pdp-info">
          <span className="card-product-brand">{product.brand}</span>
          <h1>{product.name}</h1>
          <p className="muted">{product.description}</p>

          <div className="pdp-price">
            {product.comparePrice && <s className="faint">{money(product.comparePrice)}</s>}
            <strong>{money(product.price)}</strong>
            <span className="muted">{installments()} · aceitamos Brasilcard</span>
            {product.category === "celulares" && (
              <span className="boleto"><ReceiptText size={16} />ou em até <b>18x no boleto</b> — celulares novos</span>
            )}
            <span className="pix">ou <b>{money(pix)}</b> no Pix</span>
            <img src="/brand/selo-pix.svg" alt="5% off pagando no Pix" className="pdp-pix-seal" />
          </div>

          {product.colors && product.colors.length > 1 && (
            <div className="pdp-colors">
              <span className="faint">Cor</span>
              <div className="row">
                {product.colors.map((c) => (
                  <button key={c} className={c === current ? "on" : ""} style={{ background: c }} onClick={() => setColor(c)} aria-label={`Cor ${c}`} />
                ))}
              </div>
            </div>
          )}

          <div className="pdp-buy">
            <div className="qty lg">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir"><Minus /></button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Aumentar"><Plus /></button>
            </div>
            <button
              className="btn primary lg"
              disabled={product.stock <= 0}
              onClick={() => {
                if (buy(product.id, product.colors ? current : undefined, qty)) toast("Adicionado ao carrinho");
              }}
            >
              <ShoppingBag />{product.stock > 0 ? (product.category === "celulares" ? "Comprar" : "Adicionar ao carrinho") : "Esgotado"}
            </button>
          </div>
          <a className="btn ghost block" href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(`Olá! Tenho interesse no ${product.name}`)}`} target="_blank" rel="noreferrer">
            <MessageCircle />Tirar dúvida no WhatsApp
          </a>

          {product.category === "celulares" && (
            <p className="pdp-trade"><Repeat /><span><b>Seu usado vale entrada — mesmo quebrado.</b> Ao comprar, conte qual é o seu e a gente abate o valor depois da avaliação.</span></p>
          )}

          <ul className="pdp-perks">
            <li><Truck /><span><b>Entrega em Barra do Garças</b> grátis acima de {money(info.freeShippingFrom)}</span></li>
            <li><Store /><span><b>Retire na loja</b> {info.address}</span></li>
            <li><CreditCard /><span><b>Até 12x no cartão</b> com taxas baixas · aceitamos Brasilcard</span></li>
            <li><ShieldCheck /><span><b>Garantia</b> e nota fiscal em todos os produtos</span></li>
          </ul>
          <span className={`pill ${product.stock > 5 ? "ok" : product.stock > 0 ? "warn" : "bad"}`}>
            {product.stock > 5 ? "Em estoque" : product.stock > 0 ? `Só ${product.stock} em estoque` : "Sem estoque"}
          </span>
          <Slot name="site.product.aside" />
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="kicker">Combina com</span>
              <h2>Você também pode gostar</h2>
            </div>
          </div>
          <div className="products">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
