import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PackageSearch, SlidersHorizontal } from "lucide-react";
import { useCollection } from "@/core/store";
import { categories, categoryLabel, db } from "@/domain/db";
import { ProductCard } from "@/site/ProductCard";
import { Pulse } from "@/ui/Pulse";

const sorts = {
  relevancia: "Relevância",
  menor: "Menor preço",
  maior: "Maior preço",
  novos: "Novidades",
} as const;

export function Shop() {
  const products = useCollection(db.products);
  const [params, setParams] = useSearchParams();
  const category = params.get("categoria") ?? "";
  const q = params.get("q") ?? "";
  const sort = (params.get("ordem") ?? "relevancia") as keyof typeof sorts;
  const brand = params.get("marca") ?? "";

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const brands = [...new Set(products.filter((p) => p.active && (!category || p.category === category)).map((p) => p.brand))].sort();

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.active &&
        (!category || p.category === category) &&
        (!brand || p.brand === brand) &&
        (!term || `${p.name} ${p.brand} ${p.description} ${p.highlights?.join(" ") ?? ""} ${p.specs?.map((s) => s.value).join(" ") ?? ""}`.toLowerCase().includes(term)),
    );
    const by = {
      relevancia: (a: typeof filtered[0], b: typeof filtered[0]) => Number(b.featured) - Number(a.featured) || Number(b.stock > 0) - Number(a.stock > 0),
      menor: (a: typeof filtered[0], b: typeof filtered[0]) => a.price - b.price,
      maior: (a: typeof filtered[0], b: typeof filtered[0]) => b.price - a.price,
      novos: (a: typeof filtered[0], b: typeof filtered[0]) => b.createdAt.localeCompare(a.createdAt),
    }[sort];
    return [...filtered].sort(by);
  }, [products, category, brand, q, sort]);

  return (
    <>
      <section className="page-head">
        <Pulse className="hero-pulse" />
        <div className="wrap">
          <nav className="crumbs"><Link to="/">Início</Link>/<span>Vitrine</span></nav>
          <h1>{category ? <>{categoryLabel(category)}</> : <>A <em>vitrine</em></>}</h1>
          <p>{q ? `Resultados para “${q}”` : "Celulares, capinhas e acessórios escolhidos a dedo. Retire na loja ou receba em casa."}</p>
        </div>
      </section>

      <div className="wrap shop">
        <div className="shop-bar">
          <div className="chips">
            <button className={!category ? "on" : ""} onClick={() => set("categoria", "")}>Tudo</button>
            {categories.map((c) => (
              <button key={c.id} className={category === c.id ? "on" : ""} onClick={() => { set("categoria", c.id); }}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="row">
            <SlidersHorizontal className="faint" size={18} />
            <select className="input slim" value={brand} onChange={(e) => set("marca", e.target.value)} aria-label="Marca">
              <option value="">Todas as marcas</option>
              {brands.map((b) => <option key={b}>{b}</option>)}
            </select>
            <select className="input slim" value={sort} onChange={(e) => set("ordem", e.target.value)} aria-label="Ordenar">
              {Object.entries(sorts).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <p className="faint shop-count">{list.length} {list.length === 1 ? "produto" : "produtos"}</p>

        {list.length ? (
          <div className="products">
            {list.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="empty">
            <PackageSearch />
            <p>Nada encontrado com esses filtros.</p>
            <button className="btn ghost" onClick={() => setParams({})}>Limpar filtros</button>
          </div>
        )}
      </div>
    </>
  );
}
