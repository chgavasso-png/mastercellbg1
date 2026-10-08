import { Link } from "react-router-dom";
import { ArrowRight, BatteryCharging, CreditCard, Droplets, Headphones, Laptop, Monitor, Repeat, ShieldCheck, Smartphone, Tablet, Truck, WalletCards, Wrench, Zap, Layers, Cable } from "lucide-react";
import { Slot } from "@/core/plugins";
import { useCollection, useDocument } from "@/core/store";
import { categories, db, store } from "@/domain/db";
import { Pulse } from "@/ui/Pulse";
import { ProductArt } from "@/ui/ProductArt";
import { ProductCard } from "./ProductCard";
import type { Category } from "@/domain/types";

const categoryArt: Record<Category, { color: string; icon: typeof Smartphone }> = {
  celulares: { color: "#3c3f4a", icon: Smartphone },
  capinhas: { color: "#fcd404", icon: Layers },
  peliculas: { color: "#9ca4d0", icon: ShieldCheck },
  carregadores: { color: "#f2f2f2", icon: BatteryCharging },
  fones: { color: "#c8d3e0", icon: Headphones },
  acessorios: { color: "#e7c4d9", icon: Cable },
};

export function Home() {
  const products = useCollection(db.products);
  const info = useDocument(store);
  const phones = products.filter((p) => p.active && p.category === "celulares").sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || Number(b.featured) - Number(a.featured)).slice(0, 8);
  const featured = products.filter((p) => p.active && p.featured && p.category !== "celulares").slice(0, 8);
  const count = (c: string) => products.filter((p) => p.active && p.category === c).length;

  return (
    <>
      <section className="hero">
        <div className="hero-grid" aria-hidden />
        <Pulse className="hero-pulse" />
        <div className="wrap hero-inner">
          <div className="hero-copy">
            <span className="eyebrow"><i />Loja & assistência em Barra do Garças</span>
            <h1>
              Seu celular <br />
              no <em>ritmo</em> certo.
            </h1>
            <p>
              Smartphones, capinhas e acessórios — e uma bancada técnica para celular, tablet, notebook
              e computador, com orçamento sem compromisso.
            </p>
            <div className="row wrap">
              <Link to="/loja" className="btn primary lg">Ver vitrine <ArrowRight /></Link>
              <Link to="/assistencia" className="btn lg hero-ghost"><Wrench /> Pedir assistência</Link>
            </div>
            <dl className="hero-stats">
              <div><dt>Grátis</dt><dd>orçamento sem compromisso</dd></div>
              <div><dt>12x</dt><dd>no cartão, com taxas baixas</dd></div>
              <div><dt>90 dias</dt><dd>de garantia em reparos</dd></div>
            </dl>
          </div>
          <div className="hero-visual">
            <div className="hero-glow" />
            <img src="/brand/logo.png" alt="MasterCell" className="hero-logo" />
            <img src="/brand/selo-garantia.svg" alt="Garantia de 90 dias" className="hero-seal" />
            <div className="hero-chip chip-a"><Zap /> Conserto de celular, notebook e PC</div>
            <div className="hero-chip chip-b"><Truck /> Entrega na cidade</div>
          </div>
        </div>
      </section>

      <section className="perks">
        <div className="wrap">
          <div><Truck /><p><b>Frete grátis</b><span>acima de R$ {info.freeShippingFrom}</span></p></div>
          <div><CreditCard /><p><b>Até 18x no boleto</b><span>em celulares novos · 12x no cartão</span></p></div>
          <div><WalletCards /><p><b>Aceitamos Brasilcard</b><span>além do Pix e cartões</span></p></div>
          <div><Repeat /><p><b>Seu usado vale entrada</b><span>mesmo quebrado</span></p></div>
        </div>
      </section>

      <Slot name="site.home.after-hero" />

      {phones.length > 0 && (
        <section className="section wrap">
          <div className="section-head">
            <div>
              <span className="kicker">Celulares</span>
              <h2>Vitrine de celulares</h2>
              <p className="muted section-sub">Novos com nota e garantia · <b>até 18x no boleto</b> ou 12x no cartão</p>
            </div>
            <Link to="/loja?categoria=celulares" className="link-arrow">Ver todos os celulares <ArrowRight /></Link>
          </div>
          <div className="products">
            {phones.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <section className="section wrap">
        <div className="trade-band">
          <div className="trade-band-art" aria-hidden>
            <div className="trade-phone old cracked"><Smartphone /></div>
            <Repeat className="trade-arrow" />
            <div className="trade-phone new"><Smartphone /></div>
          </div>
          <div className="trade-band-copy">
            <span className="kicker">Troca facilitada</span>
            <h2>Seu celular velho vale <em>entrada</em>.</h2>
            <p className="muted">
              Aceitamos aparelhos usados e até quebrados como parte do pagamento. Escolha seu novo celular,
              conte qual é o seu e a gente avalia e abate do valor. O resto você parcela em até 18x no boleto, 12x no cartão ou passa no Brasilcard.
            </p>
            <div className="row wrap">
              <Link to="/loja?categoria=celulares" className="btn primary lg">Escolher meu novo celular <ArrowRight /></Link>
              <a className="btn ghost lg" href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent("Olá! Quero avaliar meu celular usado para dar de entrada.")}`} target="_blank" rel="noreferrer">Avaliar pelo WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section wrap">
        <div className="section-head">
          <div>
            <span className="kicker">Categorias</span>
            <h2>Tudo pro seu celular</h2>
          </div>
          <Link to="/loja" className="link-arrow">Ver tudo <ArrowRight /></Link>
        </div>
        <div className="categories">
          {categories.map((c) => {
            const art = categoryArt[c.id];
            const Icon = art.icon;
            return (
              <Link key={c.id} to={`/loja?categoria=${c.id}`} className="category" style={{ "--tint": art.color } as React.CSSProperties}>
                <ProductArt category={c.id} color={art.color} />
                <div>
                  <Icon />
                  <b>{c.label}</b>
                  <span>{count(c.id)} itens</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section wrap">
        <div className="section-head">
          <div>
            <span className="kicker">Vitrine</span>
            <h2>Destaques da semana</h2>
          </div>
          <Link to="/loja" className="link-arrow">Toda a loja <ArrowRight /></Link>
        </div>
        <div className="products">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section className="section wrap">
        <div className="service-banner">
          <Pulse className="service-pulse" />
          <img src="/brand/selo-assistencia.svg" alt="" className="service-seal" />
          <div className="service-copy">
            <span className="kicker on-dark">Assistência técnica</span>
            <h2>Quebrou? A gente <em>ressuscita</em>.</h2>
            <p>Consertamos celulares, tablets, notebooks e computadores: troca de tela, bateria, conector, teclado, reparo de placa, formatação, upgrade e recuperação após contato com água.</p>
            <Link to="/assistencia" className="btn primary lg">Solicitar orçamento <ArrowRight /></Link>
          </div>
          <ul className="service-list">
            {([
              [Smartphone, "Celulares", "tela, bateria, conector, câmera"],
              [Tablet, "Tablets", "tela, bateria, carga"],
              [Laptop, "Notebooks", "tela, teclado, lentidão, formatação"],
              [Monitor, "Computadores", "não liga, upgrade, limpeza"],
              [Droplets, "Dano por água", "diagnóstico sem compromisso"],
              [Wrench, "Reparo de placa", "bancada especializada"],
            ] as const).map(([Icon, t, s]) => (
              <li key={t}><Icon /><b>{t}</b><span>{s}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <Slot name="site.home.end" />
    </>
  );
}
