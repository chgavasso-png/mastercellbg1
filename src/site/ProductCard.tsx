import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import type { Product } from "@/domain/types";
import { buy } from "@/domain/services";
import { money } from "@/core/format";
import { ProductArt } from "@/ui/ProductArt";
import { toast } from "@/ui/Toast";

export function ProductCard({ product }: { product: Product }) {
  const off = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;
  const soldOut = product.stock <= 0;

  return (
    <article className="card-product" style={{ "--tint": product.color } as React.CSSProperties}>
      <Link to={`/produto/${product.id}`} className="card-product-media">
        <ProductArt category={product.category} color={product.color} imageUrl={product.imageUrl} name={product.name} />
        <div className="card-product-flags">
          {off > 0 && <span className="flag flag-off">-{off}%</span>}
          {product.stock > 0 && product.stock <= 5 && <span className="flag">Últimas {product.stock}</span>}
          {soldOut && <span className="flag flag-dark">Esgotado</span>}
        </div>
      </Link>
      <div className="card-product-body">
        <span className="card-product-brand">{product.brand}</span>
        <Link to={`/produto/${product.id}`} className="card-product-name">{product.name}</Link>
        {product.colors && product.colors.length > 1 && (
          <div className="swatches">
            {product.colors.map((c) => <i key={c} style={{ background: c }} />)}
          </div>
        )}
        <div className="card-product-foot">
          <div>
            {product.comparePrice && <s className="faint">{money(product.comparePrice)}</s>}
            <strong className="price">{money(product.price)}</strong>
            {product.category === "celulares" ? (
              <small className="faint">até 18x no boleto · 12x no cartão</small>
            ) : (
              product.price > 200 && <small className="faint">em até 12x no cartão</small>
            )}
          </div>
          <button
            className="add"
            disabled={soldOut}
            aria-label={`Adicionar ${product.name} ao carrinho`}
            onClick={() => {
              if (buy(product.id, product.colors?.[0])) toast(`${product.name} no carrinho`);
            }}
          >
            <Plus />
          </button>
        </div>
      </div>
    </article>
  );
}
