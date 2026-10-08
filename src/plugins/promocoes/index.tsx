import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Copy, Megaphone, Plus, Trash2, X } from "lucide-react";
import { definePlugin } from "@/core/plugins";
import { useCollection } from "@/core/store";
import { db } from "@/domain/db";
import { activePromotion, cart } from "@/domain/services";
import type { Promotion } from "@/domain/types";
import { day } from "@/core/format";
import { Card, PageHead, Table, type Column } from "@/admin/kit";
import { Modal } from "@/ui/Modal";
import { Pulse } from "@/ui/Pulse";
import { toast } from "@/ui/Toast";

const seenKey = (id: string) => `mastter:promo-seen:${id}`;

const wasSeen = (id: string) => {
  try {
    return sessionStorage.getItem(seenKey(id)) === "1";
  } catch {
    return false;
  }
};

const markSeen = (id: string) => {
  try {
    sessionStorage.setItem(seenKey(id), "1");
  } catch {
    return;
  }
};

const forget = (id: string) => {
  try {
    sessionStorage.removeItem(seenKey(id));
  } catch {
    return;
  }
};

function PromoCard({ promo, onClose, onCta }: { promo: Omit<Promotion, "id" | "createdAt">; onClose?: () => void; onCta?: () => void }) {
  return (
    <div className="promo">
      <Pulse className="promo-pulse" />
      {onClose && <button className="icon-btn promo-close" onClick={onClose} aria-label="Fechar"><X /></button>}
      <div className="promo-burst">
        <b>{promo.discount}%</b>
        <span>OFF</span>
      </div>
      <h3>{promo.title}</h3>
      <p>{promo.message}</p>
      <button
        className="promo-coupon"
        onClick={() => {
          navigator.clipboard?.writeText(promo.coupon).catch(() => undefined);
          toast(`Cupom ${promo.coupon} copiado`);
        }}
      >
        <span>{promo.coupon}</span>
        <Copy />
      </button>
      <button className="btn primary lg block" onClick={onCta}>{promo.cta}</button>
      <small>Válido até {day(promo.endsAt)}</small>
    </div>
  );
}

function Popup() {
  useCollection(db.promotions);
  const promo = activePromotion();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!promo || wasSeen(promo.id)) return;
    const t = setTimeout(() => setOpen(true), promo.delay * 1000);
    return () => clearTimeout(t);
  }, [promo?.id, promo?.delay]);

  if (!promo || !open) return null;

  const close = () => {
    markSeen(promo.id);
    setOpen(false);
  };

  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <PromoCard
        promo={promo}
        onClose={close}
        onCta={() => {
          cart.set({ coupon: promo.coupon });
          close();
          navigate(promo.link);
          toast(`Cupom ${promo.coupon} aplicado ao carrinho`);
        }}
      />
    </div>,
    document.body,
  );
}

type Draft = Omit<Promotion, "id" | "createdAt"> & { id?: string };

const blank = (): Draft => ({
  title: "",
  message: "",
  coupon: "",
  discount: 10,
  active: true,
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 14 * 864e5).toISOString(),
  delay: 3,
  cta: "Aproveitar",
  link: "/loja",
});

function PromotionsAdmin() {
  const promotions = useCollection(db.promotions);
  const [edit, setEdit] = useState<Draft | null>(null);
  const live = activePromotion();

  const columns: Column<Promotion>[] = [
    {
      key: "title",
      label: "Campanha",
      render: (p) => (
        <div className="cell-main">
          <div><b>{p.title}</b><span className="faint">{p.message}</span></div>
        </div>
      ),
    },
    { key: "coupon", label: "Cupom", render: (p) => <code className="code">{p.coupon}</code> },
    { key: "discount", label: "Desconto", align: "right", render: (p) => <b>{p.discount}%</b> },
    { key: "period", label: "Período", render: (p) => <span className="muted">{day(p.startsAt)} → {day(p.endsAt)}</span> },
    {
      key: "status",
      label: "Status",
      render: (p) =>
        live?.id === p.id ? <span className="pill ok">No ar</span>
        : !p.active ? <span className="pill">Pausada</span>
        : new Date(p.startsAt) > new Date() ? <span className="pill info">Agendada</span>
        : <span className="pill bad">Encerrada</span>,
    },
    {
      key: "toggle",
      label: "Ativa",
      align: "center",
      render: (p) => (
        <label className="switch" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={p.active} onChange={() => db.promotions.update(p.id, { active: !p.active })} />
          <span />
        </label>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Promoções"
        subtitle="Pop-ups com cupom que aparecem para quem visita a loja. Só uma campanha fica no ar por vez."
        actions={<button className="btn primary" onClick={() => setEdit(blank())}><Plus />Nova campanha</button>}
      />
      <Card className="flush">
        <Table rows={promotions} columns={columns} onRow={(p) => setEdit({ ...p })} />
      </Card>

      {edit && (
        <Modal
          wide
          title={edit.id ? "Editar campanha" : "Nova campanha"}
          onClose={() => setEdit(null)}
          footer={
            <>
              {edit.id && <button className="btn danger" onClick={() => { db.promotions.remove(edit.id!); setEdit(null); }}><Trash2 />Excluir</button>}
              <span style={{ flex: 1 }} />
              <button className="btn ghost" onClick={() => { if (edit.id) forget(edit.id); window.open("/", "_blank"); }}>Testar no site</button>
              <button className="btn primary" onClick={() => {
                if (!edit.title || !edit.coupon) return toast("Título e cupom são obrigatórios");
                const { id, ...data } = edit;
                const payload = { ...data, coupon: data.coupon.toUpperCase().replace(/\s/g, "") };
                if (id) db.promotions.update(id, payload);
                else db.promotions.insert(payload);
                setEdit(null);
                toast("Campanha salva");
              }}>Salvar</button>
            </>
          }
        >
          <div className="promo-editor">
            <div className="grid-2">
              <label className="field span-2"><span>Título</span><input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} autoFocus /></label>
              <label className="field span-2"><span>Mensagem</span><textarea value={edit.message} onChange={(e) => setEdit({ ...edit, message: e.target.value })} /></label>
              <label className="field"><span>Cupom</span><input value={edit.coupon} onChange={(e) => setEdit({ ...edit, coupon: e.target.value.toUpperCase() })} /></label>
              <label className="field"><span>Desconto (%)</span><input type="number" min="1" max="90" value={edit.discount} onChange={(e) => setEdit({ ...edit, discount: +e.target.value })} /></label>
              <label className="field"><span>Início</span><input type="date" value={edit.startsAt.slice(0, 10)} onChange={(e) => setEdit({ ...edit, startsAt: new Date(`${e.target.value}T00:00`).toISOString() })} /></label>
              <label className="field"><span>Fim</span><input type="date" value={edit.endsAt.slice(0, 10)} onChange={(e) => setEdit({ ...edit, endsAt: new Date(`${e.target.value}T23:59`).toISOString() })} /></label>
              <label className="field"><span>Texto do botão</span><input value={edit.cta} onChange={(e) => setEdit({ ...edit, cta: e.target.value })} /></label>
              <label className="field"><span>Leva para</span><input value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} /></label>
              <label className="field span-2">
                <span>Aparece após {edit.delay}s na página</span>
                <input type="range" min="0" max="20" value={edit.delay} onChange={(e) => setEdit({ ...edit, delay: +e.target.value })} />
              </label>
              <label className="check span-2"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Campanha ativa</label>
            </div>
            <div className="promo-preview">
              <span className="faint">Pré-visualização</span>
              <PromoCard promo={{ ...edit, title: edit.title || "Título da campanha", coupon: edit.coupon || "CUPOM" }} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default definePlugin({
  id: "promocoes",
  name: "Pop-up de promoções",
  admin: [{ path: "promocoes", label: "Promoções", icon: Megaphone, group: "Marketing", order: 51, element: <PromotionsAdmin /> }],
  slots: { "site.overlay": [Popup] },
});
