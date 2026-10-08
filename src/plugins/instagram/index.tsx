import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Images, Pin, Play, Plus, RefreshCw, ShoppingBag, Trash2 } from "lucide-react";
import { definePlugin } from "@/core/plugins";
import { useCollection, useDocument } from "@/core/store";
import { db, store } from "@/domain/db";
import type { InstaPost } from "@/domain/types";
import { day, short, stamp } from "@/core/format";
import { clearLive, fetchLatest, instaConfig, mediaOf, useLatestPosts } from "./live";
import { PageHead } from "@/admin/kit";
import { Instagram as InstagramIcon } from "@/ui/Instagram";
import { ImagePicker } from "@/ui/ImagePicker";
import { Modal } from "@/ui/Modal";
import { ProductArt } from "@/ui/ProductArt";
import { toast } from "@/ui/Toast";

function PostMedia({ post }: { post: InstaPost }) {
  const product = post.productId ? db.products.get(post.productId) : undefined;
  if (post.imageUrl) return <img src={post.imageUrl} alt="" loading="lazy" />;
  return (
    <div className="post-art" style={{ "--tint": post.tone } as React.CSSProperties}>
      {product && <ProductArt category={product.category} color={product.colors?.[0] ?? product.color} />}
    </div>
  );
}

function productIn(caption?: string) {
  if (!caption) return undefined;
  const text = caption.toLowerCase();
  return db.products.all().find((p) => p.active && text.includes(p.name.toLowerCase()));
}

function Feed() {
  const posts = useCollection(db.posts);
  const info = useDocument(store);
  const live = useLatestPosts();
  const manual = posts.filter((p) => p.active).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  if (!live.posts.length && !manual.length) return null;

  return (
    <section className="section wrap">
      <div className="section-head">
        <div>
          <span className="kicker">@{info.instagram}</span>
          <h2>Vitrine do Instagram</h2>
          {live.posts.length > 0 && <p className="muted section-sub">Últimas publicações do nosso perfil</p>}
        </div>
        <a className="btn ghost" href={`https://instagram.com/${info.instagram}`} target="_blank" rel="noreferrer"><InstagramIcon />Seguir</a>
      </div>
      <div className="insta">
        {live.posts.length > 0
          ? live.posts.map((p) => {
              const product = productIn(p.caption);
              return (
                <article key={p.id} className="insta-post">
                  <img src={mediaOf(p)} alt={p.caption?.slice(0, 80) ?? ""} loading="lazy" />
                  {p.media_type === "VIDEO" && <span className="insta-kind"><Play /></span>}
                  {p.media_type === "CAROUSEL_ALBUM" && <span className="insta-kind"><Images /></span>}
                  <div className="insta-hover">
                    {p.caption && <p>{p.caption}</p>}
                    <div className="row between">
                      <span className="row faint-light">{p.like_count !== undefined ? <><Heart />{short(p.like_count)}</> : day(p.timestamp)}</span>
                      {product
                        ? <Link to={`/produto/${product.id}`} className="btn primary sm"><ShoppingBag />Comprar</Link>
                        : <a href={p.permalink} target="_blank" rel="noreferrer" className="btn primary sm">Ver post</a>}
                    </div>
                  </div>
                </article>
              );
            })
          : manual.map((p) => {
              const product = p.productId ? db.products.get(p.productId) : undefined;
              return (
                <article key={p.id} className="insta-post">
                  <PostMedia post={p} />
                  <div className="insta-hover">
                    <p>{p.caption}</p>
                    <div className="row between">
                      <span className="row"><Heart />{short(p.likes)}</span>
                      {product && <Link to={`/produto/${product.id}`} className="btn primary sm"><ShoppingBag />Comprar</Link>}
                    </div>
                  </div>
                </article>
              );
            })}
      </div>
    </section>
  );
}

function Connection() {
  const config = useDocument(instaConfig);
  const live = useLatestPosts();
  const [token, setToken] = useState(config.token ?? "");
  const [endpoint, setEndpoint] = useState(config.endpoint ?? "");
  const [busy, setBusy] = useState(false);
  const connected = Boolean(config.token || config.endpoint);

  const connect = async () => {
    instaConfig.set({
      token: token.trim() || undefined,
      tokenAt: token.trim() && token.trim() !== config.token ? new Date().toISOString() : config.tokenAt,
      endpoint: endpoint.trim() || undefined,
    });
    if (!token.trim() && !endpoint.trim()) return;
    setBusy(true);
    try {
      const posts = await fetchLatest(true);
      toast(`Conectado · ${posts.length} publicações carregadas`);
    } catch (e) {
      toast(`Não conectou: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="a-card insta-connect">
      <header className="row between wrap">
        <h3 className="row"><RefreshCw size={18} />Últimas publicações automáticas</h3>
        {connected
          ? live.error ? <span className="pill bad">Erro na conexão</span> : <span className="pill ok">Conectado</span>
          : <span className="pill">Desconectado · usando posts manuais</span>}
      </header>
      <p className="muted">
        Conectado, o site mostra sozinho os últimos posts do Instagram, atualizando a cada 30 minutos.
        Precisa de uma conta profissional (comercial ou criador) e de um token da API do Instagram gerado no painel da Meta.
      </p>
      <div className="grid-2">
        <label className="field">
          <span>Token de acesso</span>
          <input type="password" autoComplete="off" placeholder="IGAA…" value={token} onChange={(e) => setToken(e.target.value)} />
          <small>Renovado automaticamente a cada 30 dias.</small>
        </label>
        <label className="field">
          <span>ou endpoint do servidor (recomendado)</span>
          <input placeholder="https://sua-api.com/instagram" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
          <small>Mantém o token fora do site. Deve devolver o JSON da API (data[]).</small>
        </label>
        <label className="field">
          <span>Quantidade de posts</span>
          <select value={config.limit} onChange={(e) => { instaConfig.set({ limit: +e.target.value }); clearLive(); }}>
            {[6, 9, 12].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      {live.error && <small className="error">{live.error}</small>}
      <div className="row wrap">
        <button className="btn primary" disabled={busy} onClick={connect}><RefreshCw />{busy ? "Conectando…" : connected ? "Salvar e atualizar" : "Conectar"}</button>
        {connected && (
          <button className="btn ghost" onClick={() => { instaConfig.set({ token: undefined, endpoint: undefined, tokenAt: undefined }); clearLive(); setToken(""); setEndpoint(""); }}>
            Desconectar
          </button>
        )}
        {live.at && <span className="faint">Atualizado em {stamp(live.at)}</span>}
      </div>
      {live.posts.length > 0 && (
        <div className="insta-strip">
          {live.posts.map((p) => (
            <a key={p.id} href={p.permalink} target="_blank" rel="noreferrer"><img src={mediaOf(p)} alt="" loading="lazy" /></a>
          ))}
        </div>
      )}
    </section>
  );
}

type Draft = Omit<InstaPost, "id" | "createdAt"> & { id?: string };

function InstagramAdmin() {
  const posts = useCollection(db.posts);
  const products = useCollection(db.products);
  const info = useDocument(store);
  const [edit, setEdit] = useState<Draft | null>(null);

  const sorted = [...posts].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHead
        title="Instagram"
        subtitle={<>Vitrine do Instagram na página inicial. Perfil: <b>@{info.instagram}</b></>}
        actions={
          <button className="btn primary" onClick={() => setEdit({ caption: "", tone: "#fcd404", likes: 0, pinned: false, active: true })}>
            <Plus />Novo post
          </button>
        }
      />
      <label className="field" style={{ maxWidth: 360, marginBottom: 20 }}>
        <span>Usuário do Instagram</span>
        <input value={info.instagram} onChange={(e) => store.set({ instagram: e.target.value.replace("@", "") })} />
      </label>

      <Connection />

      <h3 className="insta-manual-title">Posts manuais <span className="faint">· aparecem quando o Instagram não está conectado</span></h3>

      <div className="insta admin-insta">
        {sorted.map((p) => (
          <article key={p.id} className={`insta-post${p.active ? "" : " off"}`} onClick={() => setEdit({ ...p })}>
            <PostMedia post={p} />
            {p.pinned && <span className="insta-pin"><Pin /></span>}
            <div className="insta-meta">
              <p>{p.caption}</p>
              <span className="row faint"><Heart size={14} />{short(p.likes)}{!p.active && " · oculto"}</span>
            </div>
          </article>
        ))}
      </div>

      {edit && (
        <Modal
          title={edit.id ? "Editar post" : "Novo post"}
          onClose={() => setEdit(null)}
          footer={
            <>
              {edit.id && <button className="btn danger" onClick={() => { db.posts.remove(edit.id!); setEdit(null); }}><Trash2 />Excluir</button>}
              <span style={{ flex: 1 }} />
              <button className="btn ghost" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn primary" onClick={() => {
                const { id, ...data } = edit;
                if (id) db.posts.update(id, data);
                else db.posts.insert(data);
                setEdit(null);
                toast("Vitrine do Instagram atualizada");
              }}>Salvar</button>
            </>
          }
        >
          <div className="stack">
            <ImagePicker value={edit.imageUrl} onChange={(imageUrl) => setEdit({ ...edit, imageUrl })} label="Foto do post" />
            <label className="field"><span>Legenda</span><textarea value={edit.caption} onChange={(e) => setEdit({ ...edit, caption: e.target.value })} /></label>
            <div className="grid-2">
              <label className="field">
                <span>Produto marcado</span>
                <select value={edit.productId ?? ""} onChange={(e) => setEdit({ ...edit, productId: e.target.value || undefined })}>
                  <option value="">Nenhum</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="field"><span>Cor de fundo</span><input type="color" value={edit.tone} onChange={(e) => setEdit({ ...edit, tone: e.target.value })} /></label>
              <label className="field"><span>Curtidas</span><input type="number" min="0" value={edit.likes} onChange={(e) => setEdit({ ...edit, likes: +e.target.value })} /></label>
            </div>
            <label className="check"><input type="checkbox" checked={edit.pinned} onChange={(e) => setEdit({ ...edit, pinned: e.target.checked })} />Fixar no topo</label>
            <label className="check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Exibir no site</label>
          </div>
        </Modal>
      )}
    </>
  );
}

export default definePlugin({
  id: "instagram",
  name: "Vitrine Instagram",
  admin: [{ path: "instagram", label: "Instagram", icon: InstagramIcon, group: "Marketing", order: 50, element: <InstagramAdmin /> }],
  slots: { "site.home.end": [Feed] },
});
