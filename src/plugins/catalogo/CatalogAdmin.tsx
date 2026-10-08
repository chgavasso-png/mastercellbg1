import { useState } from "react";
import { Copy, Plus, Star, Trash2 } from "lucide-react";
import { useCollection } from "@/core/store";
import { categories, categoryLabel, db } from "@/domain/db";
import type { Category, Product } from "@/domain/types";
import { money, percent } from "@/core/format";
import { Card, PageHead, SearchBox, Table, Tabs, matches, type Column } from "@/admin/kit";
import { ProductArt } from "@/ui/ProductArt";
import { ImagePicker } from "@/ui/ImagePicker";
import { Modal } from "@/ui/Modal";
import { toast } from "@/ui/Toast";
import { DescriptionEditor, cleanDescription } from "./DescriptionEditor";

type Draft = Omit<Product, "id" | "createdAt"> & { id?: string };

const blank = (): Draft => ({
  name: "",
  brand: "MasterCell",
  category: "capinhas",
  price: 0,
  cost: 0,
  stock: 0,
  color: "#fcd404",
  colors: [],
  description: "",
  featured: false,
  active: true,
  tags: [],
});

export function CatalogAdmin() {
  const products = useCollection(db.products);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"todos" | Category>("todos");
  const [editing, setEditing] = useState<Draft | null>(null);

  const rows = products.filter((p) => (tab === "todos" || p.category === tab) && matches(q, p.name, p.brand));
  const stockValue = products.reduce((s, p) => s + p.cost * p.stock, 0);

  const columns: Column<Product>[] = [
    {
      key: "name",
      label: "Produto",
      sort: (p) => p.name,
      render: (p) => (
        <div className="cell-main">
          <div className="thumb sm" style={{ "--tint": p.color } as React.CSSProperties}>
            <ProductArt category={p.category} color={p.color} imageUrl={p.imageUrl} />
          </div>
          <div>
            <b>{p.name}</b>
            <span className="faint">{p.brand} · {categoryLabel(p.category)}</span>
          </div>
        </div>
      ),
    },
    { key: "price", label: "Preço", align: "right", sort: (p) => p.price, render: (p) => <b className="tabular">{money(p.price)}</b> },
    { key: "margin", label: "Margem", align: "right", sort: (p) => (p.price - p.cost) / p.price, render: (p) => <span className="tabular muted">{percent(p.price ? (p.price - p.cost) / p.price : 0)}</span> },
    {
      key: "stock",
      label: "Estoque",
      align: "center",
      sort: (p) => p.stock,
      render: (p) => <span className={`pill plain ${p.stock === 0 ? "bad" : p.stock <= 5 ? "warn" : ""}`}>{p.stock}</span>,
    },
    {
      key: "featured",
      label: "Destaque",
      align: "center",
      render: (p) => (
        <button
          className={`star${p.featured ? " on" : ""}`}
          onClick={(e) => { e.stopPropagation(); db.products.update(p.id, { featured: !p.featured }); }}
          aria-label="Destacar na home"
        >
          <Star />
        </button>
      ),
    },
    {
      key: "active",
      label: "Na vitrine",
      align: "center",
      render: (p) => (
        <label className="switch" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={p.active} onChange={() => db.products.update(p.id, { active: !p.active })} />
          <span />
        </label>
      ),
    },
  ];

  const save = () => {
    if (!editing?.name.trim()) return toast("Dê um nome ao produto");
    const { id, ...data } = cleanDescription(editing);
    if (id) db.products.update(id, data);
    else db.products.insert(data);
    toast(id ? "Produto atualizado" : "Produto publicado na vitrine");
    setEditing(null);
  };

  return (
    <>
      <PageHead
        title="Vitrine"
        subtitle={<>{products.filter((p) => p.active).length} produtos publicados · {money(stockValue)} em estoque (custo)</>}
        actions={<button className="btn primary" onClick={() => setEditing(blank())}><Plus />Novo produto</button>}
      />

      <div className="a-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar produto ou marca" />
        <Tabs
          value={tab}
          onChange={setTab}
          items={[{ id: "todos" as const, label: "Todos", count: products.length }, ...categories.map((c) => ({ id: c.id, label: c.label }))]}
        />
      </div>

      <Card className="flush">
        <Table rows={rows} columns={columns} onRow={(p) => setEditing({ ...p })} />
      </Card>

      {editing && (
        <Modal
          wide
          title={editing.id ? "Editar produto" : "Novo produto"}
          onClose={() => setEditing(null)}
          footer={
            <>
              {editing.id && (
                <>
                  <button className="btn danger" onClick={() => { db.products.remove(editing.id!); setEditing(null); toast("Produto removido"); }}>
                    <Trash2 />Excluir
                  </button>
                  <button className="btn soft" onClick={() => setEditing({ ...editing, id: undefined, name: `${editing.name} (cópia)` })}>
                    <Copy />Duplicar
                  </button>
                </>
              )}
              <span style={{ flex: 1 }} />
              <button className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn primary" onClick={save}>Salvar</button>
            </>
          }
        >
          <div className="product-form">
            <div className="product-preview" style={{ "--tint": editing.color } as React.CSSProperties}>
              <ProductArt category={editing.category} color={editing.color} imageUrl={editing.imageUrl} />
              <b>{editing.name || "Nome do produto"}</b>
              <span className="price">{money(editing.price)}</span>
            </div>
            <div className="grid-2">
              <label className="field span-2">
                <span>Nome</span>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
              </label>
              <label className="field">
                <span>Marca</span>
                <input value={editing.brand} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} />
              </label>
              <label className="field">
                <span>Categoria</span>
                <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as Category })}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Preço de venda</span>
                <input type="number" step="0.01" min="0" value={editing.price} onChange={(e) => setEditing({ ...editing, price: +e.target.value })} />
              </label>
              <label className="field">
                <span>Preço “de” (opcional)</span>
                <input type="number" step="0.01" min="0" value={editing.comparePrice ?? ""} onChange={(e) => setEditing({ ...editing, comparePrice: e.target.value ? +e.target.value : undefined })} />
              </label>
              <label className="field">
                <span>Custo</span>
                <input type="number" step="0.01" min="0" value={editing.cost} onChange={(e) => setEditing({ ...editing, cost: +e.target.value })} />
                <small>Margem: {percent(editing.price ? (editing.price - editing.cost) / editing.price : 0)}</small>
              </label>
              <label className="field">
                <span>Estoque</span>
                <input type="number" min="0" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: +e.target.value })} />
              </label>
              <label className="field">
                <span>Cor principal</span>
                <input type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
              </label>
              <label className="field">
                <span>Variações de cor</span>
                <input
                  placeholder="#fcd404, #131f7b"
                  value={editing.colors?.join(", ") ?? ""}
                  onChange={(e) => setEditing({ ...editing, colors: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) })}
                />
              </label>
              <DescriptionEditor value={editing} onChange={setEditing} />
              <div className="span-2">
                <ImagePicker value={editing.imageUrl} onChange={(imageUrl) => setEditing({ ...editing, imageUrl })} label="Foto do produto (opcional)" />
              </div>
              <label className="check">
                <input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} />
                Destaque na página inicial
              </label>
              <label className="check">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Visível na vitrine
              </label>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
