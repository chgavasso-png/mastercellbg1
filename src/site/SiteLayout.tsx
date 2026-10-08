import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { MapPin, Menu, MessageCircle, Phone, Search, ShoppingBag, User, X, Clock } from "lucide-react";
import { Slot, siteNav } from "@/core/plugins";
import { useDocument } from "@/core/store";
import { store } from "@/domain/db";
import { cart, cartSummary, useCart, useCustomer } from "@/domain/services";
import { Instagram } from "@/ui/Instagram";
import { Brand } from "./Brand";
import { CartDrawer } from "./CartDrawer";
import { TradeInOffer } from "./TradeIn";

export function SiteLayout() {
  const info = useDocument(store);
  const { lines } = useCart();
  const customer = useCustomer();
  const count = cartSummary(lines).count;
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenu(false);
    if (cart.get().open) cart.set({ open: false });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/loja?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="site">
      <div className="topbar">
        <div className="wrap">
          <span><MapPin />{info.address}</span>
          <span className="hide-sm"><Clock />{info.hours}</span>
          <a href={`https://wa.me/${info.whatsapp}`} target="_blank" rel="noreferrer"><Phone />{info.phone}</a>
        </div>
      </div>

      <header className={`site-header${scrolled ? " scrolled" : ""}`}>
        <div className="wrap">
          <button className="icon-btn show-sm" onClick={() => setMenu(true)} aria-label="Menu"><Menu /></button>
          <Brand />
          <nav className={`site-nav${menu ? " open" : ""}`}>
            <button className="icon-btn show-sm close" onClick={() => setMenu(false)} aria-label="Fechar menu"><X /></button>
            <NavLink to="/" end>Início</NavLink>
            {siteNav().map((r) => (
              <NavLink key={r.path} to={r.path}>{r.nav!.label}</NavLink>
            ))}
          </nav>
          <form className="site-search hide-sm" onSubmit={search} role="search">
            <Search />
            <input placeholder="Buscar celular, capinha…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </form>
          <div className="row">
            <Link to="/conta" className="icon-btn" aria-label="Minha conta" title={customer ? customer.name : "Entrar"}>
              {customer ? <span className="avatar">{customer.name[0]}</span> : <User />}
            </Link>
            <button className="icon-btn cart-btn" onClick={() => cart.set({ open: true })} aria-label="Abrir carrinho">
              <ShoppingBag />
              {count > 0 && <span className="badge">{count}</span>}
            </button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-brand">
            <img src="/brand/logo.png" alt="Mastter Cell" />
            <p>{info.tagline}. Celulares novos em até 18x no boleto, até 12x no cartão com taxas baixas, Brasilcard e seu usado (até quebrado) como entrada.</p>
            <div className="row">
              <a className="icon-btn" href={`https://instagram.com/${info.instagram}`} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram /></a>
              <a className="icon-btn" href={`https://wa.me/${info.whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle /></a>
            </div>
          </div>
          <div>
            <h4>Loja</h4>
            <Link to="/loja?categoria=celulares">Celulares</Link>
            <Link to="/loja?categoria=capinhas">Capinhas</Link>
            <Link to="/loja?categoria=carregadores">Carregadores</Link>
            <Link to="/loja?categoria=fones">Fones</Link>
          </div>
          <div>
            <h4>Atendimento</h4>
            <Link to="/assistencia">Assistência técnica</Link>
            <Link to="/conta">Minha conta</Link>
            <Link to="/conta">Meus pedidos</Link>
          </div>
          <div>
            <h4>Visite</h4>
            <p>{info.address}</p>
            <p>{info.hours}</p>
            <p>{info.phone}</p>
          </div>
        </div>
        <div className="wrap footer-base">
          <span>© {new Date().getFullYear()} {info.name}</span>
          <a href={`https://instagram.com/${info.instagram}`} target="_blank" rel="noreferrer">@{info.instagram}</a>
        </div>
      </footer>

      <a className="whats-float" href={`https://wa.me/${info.whatsapp}`} target="_blank" rel="noreferrer" aria-label="Fale no WhatsApp">
        <MessageCircle />
      </a>

      <CartDrawer />
      <TradeInOffer />
      <Slot name="site.overlay" />
    </div>
  );
}
