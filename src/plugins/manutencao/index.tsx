import { useEffect, useState } from "react";
import { remote } from "@/core/remote";
import { Link, useSearchParams } from "react-router-dom";
import {
  BatteryWarning, Bug, Camera, CircleCheck, Cpu, Droplets, HardDrive, Keyboard, Laptop, MessageCircle, Monitor, MonitorOff, Plug,
  Search, Smartphone, Tablet, Thermometer, Trash2, Turtle, Volume2, Wrench, Store, Bike, type LucideIcon,
} from "lucide-react";
import { definePlugin } from "@/core/plugins";
import { useCollection, useDocument } from "@/core/store";
import { db, deviceKinds, deviceLabel, store } from "@/domain/db";
import { requestRepair, useCustomer } from "@/domain/services";
import type { DeviceKind, Repair, RepairStatus } from "@/domain/types";
import { money, stamp } from "@/core/format";
import { Card, Kpi, PageHead, SearchBox, Table, Tabs, matches, type Column } from "@/admin/kit";
import { Modal } from "@/ui/Modal";
import { Pulse } from "@/ui/Pulse";
import { Status, repairStatus } from "@/ui/status";
import { PhotoPicker } from "@/ui/PhotoPicker";
import { QuoteAnswer } from "@/ui/QuoteAnswer";
import { toast } from "@/ui/Toast";

export const deviceIcons: Record<DeviceKind, LucideIcon> = {
  celular: Smartphone,
  tablet: Tablet,
  notebook: Laptop,
  computador: Monitor,
};

type Issue = { label: string; icon: LucideIcon };

const mobile: Issue[] = [
  { label: "Tela quebrada", icon: Smartphone },
  { label: "Bateria", icon: BatteryWarning },
  { label: "Conector de carga", icon: Plug },
  { label: "Dano por água", icon: Droplets },
  { label: "Câmera", icon: Camera },
  { label: "Som / microfone", icon: Volume2 },
  { label: "Não liga", icon: Cpu },
  { label: "Outro", icon: Wrench },
];

const issues: Record<DeviceKind, Issue[]> = {
  celular: mobile,
  tablet: mobile.map((i) => (i.label === "Tela quebrada" ? { ...i, icon: Tablet } : i)),
  notebook: [
    { label: "Tela quebrada", icon: Laptop },
    { label: "Teclado / touchpad", icon: Keyboard },
    { label: "Bateria / carregador", icon: BatteryWarning },
    { label: "Lento / travando", icon: Turtle },
    { label: "Formatação / sistema", icon: HardDrive },
    { label: "Superaquecendo", icon: Thermometer },
    { label: "Não liga", icon: Cpu },
    { label: "Outro", icon: Wrench },
  ],
  computador: [
    { label: "Não liga", icon: Cpu },
    { label: "Sem vídeo", icon: MonitorOff },
    { label: "Lento / travando", icon: Turtle },
    { label: "Formatação / sistema", icon: HardDrive },
    { label: "Vírus / limpeza", icon: Bug },
    { label: "Upgrade (SSD, memória)", icon: HardDrive },
    { label: "Superaquecendo", icon: Thermometer },
    { label: "Outro", icon: Wrench },
  ],
};

type Tracked = Pick<Repair, "protocol" | "device" | "status" | "quote" | "note" | "answer">;

function useTracking(code: string) {
  const repairs = useCollection(db.repairs);
  const [remoteHit, setRemoteHit] = useState<Tracked>();
  const term = code.trim().toLowerCase();

  useEffect(() => {
    setRemoteHit(undefined);
    if (!remote || term.length < 4) return;
    const t = setTimeout(async () => {
      const { data } = await remote!.rpc("track_repair", { code: term });
      if (data) setRemoteHit(data as Tracked);
    }, 350);
    return () => clearTimeout(t);
  }, [term]);

  if (term.length < 4) return undefined;
  return remoteHit ?? repairs.find((r) => r.protocol.toLowerCase() === term);
}

const flow: RepairStatus[] = ["recebido", "orcamento", "aprovado", "reparo", "pronto", "entregue"];

function RepairPage() {
  const customer = useCustomer();
  const info = useDocument(store);
  const [form, setForm] = useState({
    customerName: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    kind: "celular" as DeviceKind,
    device: "",
    issues: [] as string[],
    photos: [] as string[],
    details: "",
    pickup: "loja" as Repair["pickup"],
  });
  const [done, setDone] = useState<Repair | null>(null);
  const [params] = useSearchParams();
  const [lookup, setLookup] = useState(params.get("os") ?? "");
  const found = useTracking(lookup);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.issues.length) return toast("Escolha pelo menos um serviço");
    const { issues, photos, ...data } = form;
    setDone(await requestRepair({ ...data, issue: issues.join(", "), photos: photos.length ? photos : undefined, customerId: customer?.id }));
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <section className="page-head">
        <Pulse className="hero-pulse" />
        <div className="wrap">
          <nav className="crumbs"><Link to="/">Início</Link>/<span>Assistência técnica</span></nav>
          <h1>Assistência <em>técnica</em></h1>
          <p>Celulares, tablets, notebooks e computadores. Conta pra gente o que aconteceu e receba o orçamento pelo WhatsApp — sem compromisso.</p>
        </div>
      </section>

      <div className="wrap repair">
        {done ? (
          <div className="panel done-card">
            <CircleCheck className="done-icon" />
            <h1>Recebemos sua solicitação!</h1>
            <p className="muted">Seu protocolo é</p>
            <span className="protocol">{done.protocol}</span>
            <p className="muted">
              {done.pickup === "coleta" ? "Vamos combinar a coleta pelo WhatsApp." : `Traga o aparelho em ${info.address}.`} Acompanhe o status aqui mesmo com o protocolo.
            </p>
            <div className="row wrap" style={{ justifyContent: "center" }}>
              <a className="btn primary" href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(`Olá! Abri a OS ${done.protocol} pelo site.`)}`} target="_blank" rel="noreferrer"><MessageCircle />Falar no WhatsApp</a>
              <button className="btn ghost" onClick={() => setDone(null)}>Nova solicitação</button>
            </div>
          </div>
        ) : (
          <form className="panel" onSubmit={submit}>
            <h3><span className="step">1</span>Qual aparelho?</h3>
            <div className="kinds">
              {deviceKinds.map((d) => {
                const Icon = deviceIcons[d.id];
                return (
                  <button type="button" key={d.id} className={form.kind === d.id ? "on" : ""} onClick={() => setForm({ ...form, kind: d.id, issues: [] })}>
                    <Icon />{d.label}
                  </button>
                );
              })}
            </div>

            <h3 style={{ marginTop: 28 }}><span className="step">2</span>Quais serviços?</h3>
            <p className="faint" style={{ margin: "-6px 0 12px" }}>Pode marcar mais de um.</p>
            <div className="issues">
              {issues[form.kind].map(({ label, icon: Icon }) => (
                <button
                  type="button"
                  key={label}
                  aria-pressed={form.issues.includes(label)}
                  className={form.issues.includes(label) ? "on" : ""}
                  onClick={() => setForm({ ...form, issues: form.issues.includes(label) ? form.issues.filter((i) => i !== label) : [...form.issues, label] })}
                >
                  <Icon />{label}
                </button>
              ))}
            </div>
            <div className="grid-2" style={{ marginTop: 18 }}>
              <label className="field"><span>Marca e modelo</span><input required placeholder={deviceKinds.find((d) => d.id === form.kind)?.example} value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} /></label>
              <label className="field"><span>Conte mais detalhes</span><input placeholder="Caiu, molhou, parou do nada…" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></label>
            </div>

            <div className="field" style={{ marginTop: 18 }}>
              <span>Fotos do aparelho (opcional, até 4)</span>
              <PhotoPicker value={form.photos} onChange={(photos) => setForm({ ...form, photos })} />
            </div>

            <h3 style={{ marginTop: 28 }}><span className="step">3</span>Seus dados</h3>
            <div className="grid-3">
              <label className="field"><span>Nome</span><input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
              <label className="field"><span>WhatsApp</span><input required placeholder="(66) 9…" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label className="field"><span>E-mail (opcional)</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            </div>

            <h3 style={{ marginTop: 28 }}><span className="step">4</span>Como prefere?</h3>
            <div className="options">
              <label className={form.pickup === "loja" ? "on" : ""}>
                <input type="radio" name="pickup" checked={form.pickup === "loja"} onChange={() => setForm({ ...form, pickup: "loja" })} />
                <Store /><div><b>Levo na loja</b><span className="faint">{info.address}</span></div>
              </label>
              <label className={form.pickup === "coleta" ? "on" : ""}>
                <input type="radio" name="pickup" checked={form.pickup === "coleta"} onChange={() => setForm({ ...form, pickup: "coleta" })} />
                <Bike /><div><b>Quero coleta</b><span className="faint">buscamos na sua casa</span></div>
              </label>
            </div>
            <button className="btn primary lg" style={{ marginTop: 24 }}><Wrench />Solicitar orçamento grátis</button>
          </form>
        )}

        <aside className="stack">
          <div className="panel">
            <h3>Acompanhar conserto</h3>
            <label className="a-search" style={{ maxWidth: "none" }}>
              <Search />
              <input placeholder="Protocolo, ex.: OS-2410" value={lookup} onChange={(e) => setLookup(e.target.value)} />
            </label>
            {found && (
              <div className="track">
                <div className="row between"><b>{found.device}</b><Status map={repairStatus} value={found.status} /></div>
                <div className="timeline">
                  {flow.map((s, i) => (
                    <span key={s} className={i <= flow.indexOf(found.status) ? "done" : ""} title={repairStatus[s].label} />
                  ))}
                </div>
                {found.quote && <p>Orçamento: <b>{money(found.quote)}</b></p>}
                {found.note && <p className="muted">{found.note}</p>}
                <QuoteAnswer key={found.protocol} repair={found} />
              </div>
            )}
            {lookup.trim().length >= 4 && !found && <p className="faint" style={{ marginTop: 10 }}>Protocolo não encontrado.</p>}
          </div>
          <div className="panel why">
            <h3>Por que a Mastter?</h3>
            <ul>
              <li><CircleCheck />Orçamento sem compromisso</li>
              <li><CircleCheck />Peças testadas antes da troca</li>
              <li><CircleCheck />Garantia de 90 dias no serviço</li>
              <li><CircleCheck />Seus dados preservados</li>
              <li><CircleCheck />Celular, tablet, notebook e PC</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function DeviceBadge({ kind = "celular" }: { kind?: DeviceKind }) {
  const Icon = deviceIcons[kind];
  return <span className="device-badge" title={deviceLabel(kind)}><Icon /></span>;
}

function RepairsAdmin() {
  const repairs = useCollection(db.repairs);
  const [tab, setTab] = useState<"abertos" | RepairStatus>("abertos");
  const [kind, setKind] = useState<"todos" | DeviceKind>("todos");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Repair | null>(null);

  const rows = [...repairs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((r) => (tab === "abertos" ? r.status !== "entregue" : r.status === tab) && (kind === "todos" || (r.kind ?? "celular") === kind) && matches(q, r.protocol, r.customerName, r.device));

  const columns: Column<Repair>[] = [
    { key: "protocol", label: "OS", sort: (r) => r.protocol, render: (r) => <b>{r.protocol}</b> },
    {
      key: "device",
      label: "Aparelho",
      render: (r) => (
        <div className="cell-main" style={{ minWidth: 200 }}>
          <DeviceBadge kind={r.kind} />
          <div><b>{r.device}</b><span className="faint">{deviceLabel(r.kind)} · {r.issue}</span></div>
        </div>
      ),
    },
    { key: "customer", label: "Cliente", sort: (r) => r.customerName, render: (r) => <div className="cell-main" style={{ minWidth: 150 }}><div><b>{r.customerName}</b><span className="faint">{r.phone}</span></div></div> },
    { key: "date", label: "Entrada", sort: (r) => r.createdAt, render: (r) => <span className="muted">{stamp(r.createdAt)}</span> },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <div className="row" style={{ gap: 6 }}>
          <Status map={repairStatus} value={r.status} />
          {r.answer === "recusado" && <span className="pill bad">recusado</span>}
          {r.photos?.length ? <span className="pill" title="Fotos enviadas pelo cliente"><Camera />{r.photos.length}</span> : null}
        </div>
      ),
    },
    { key: "quote", label: "Orçamento", align: "right", render: (r) => (r.quote ? <b className="tabular">{money(r.quote)}</b> : <span className="faint">—</span>) },
  ];

  return (
    <>
      <PageHead title="Assistência técnica" subtitle="Celulares, tablets, notebooks e computadores — ordens abertas pelo site e pelo balcão." />
      <div className="kpis">
        <Kpi label="Aguardando orçamento" value={repairs.filter((r) => r.status === "recebido" || r.status === "orcamento").length} />
        <Kpi label="Na bancada" value={repairs.filter((r) => r.status === "aprovado" || r.status === "reparo").length} icon={Wrench} />
        <Kpi tone="brand" label="Prontos p/ retirada" value={repairs.filter((r) => r.status === "pronto").length} />
        <Kpi tone="dark" label="Em orçamentos aprovados" value={money(repairs.filter((r) => ["aprovado", "reparo", "pronto"].includes(r.status)).reduce((s, r) => s + (r.quote ?? 0), 0))} />
      </div>
      <div className="a-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="OS, cliente ou aparelho" />
        <Tabs value={tab} onChange={setTab} items={[{ id: "abertos" as const, label: "Em aberto" }, ...flow.map((s) => ({ id: s, label: repairStatus[s].label }))]} />
        <Tabs
          value={kind}
          onChange={setKind}
          items={[{ id: "todos" as const, label: "Todos" }, ...deviceKinds.map((d) => ({ id: d.id, label: d.label, count: repairs.filter((r) => (r.kind ?? "celular") === d.id && r.status !== "entregue").length || undefined }))]}
        />
      </div>
      <Card className="flush">
        <Table rows={rows} columns={columns} onRow={(r) => setEdit({ ...r })} />
      </Card>

      {edit && (
        <Modal
          title={`${edit.protocol} · ${edit.device}`}
          onClose={() => setEdit(null)}
          footer={
            <>
              <a className="btn ghost" href={`https://wa.me/55${edit.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${edit.customerName.split(" ")[0]}! Sobre a ${edit.protocol} (${edit.device}): ${repairStatus[edit.status].label}${edit.quote ? ` · orçamento ${money(edit.quote)}` : ""}.${edit.status === "orcamento" && edit.quote ? ` Aceite ou recuse aqui: ${window.location.origin}/assistencia?os=${edit.protocol}` : ""}`)}`} target="_blank" rel="noreferrer">
                <MessageCircle />Avisar cliente
              </a>
              <button className="btn danger" onClick={() => {
                if (!confirm(`Excluir a ${edit.protocol} (${edit.device}) de ${edit.customerName}? Isso não pode ser desfeito.`)) return;
                db.repairs.remove(edit.id);
                setEdit(null);
                toast(`${edit.protocol} excluída`);
              }}><Trash2 />Excluir</button>
              <span style={{ flex: 1 }} />
              <button className="btn primary" onClick={() => {
                const { id, ...data } = edit;
                const before = db.repairs.get(id);
                // Orçamento novo ou reenviado: o cliente precisa responder de novo.
                if (before && (before.quote !== data.quote || (data.status === "orcamento" && before.status !== "orcamento"))) data.answer = undefined;
                db.repairs.update(id, data);
                setEdit(null);
                toast("OS atualizada");
              }}>Salvar</button>
            </>
          }
        >
          <div className="timeline">
            {flow.map((s, i) => (
              <span key={s} className={i <= flow.indexOf(edit.status) ? "done" : ""}>{repairStatus[s].label}</span>
            ))}
          </div>
          <div className="detail-grid">
            <div><span>Cliente</span><b>{edit.customerName}</b></div>
            <div><span>Contato</span><b>{edit.phone}</b></div>
            <div><span>Atendimento</span><b>{edit.pickup === "coleta" ? "Coleta" : "Na loja"}</b></div>
            <div><span>Tipo</span><b>{deviceLabel(edit.kind)}</b></div>
            <div className="span-all"><span>Relato</span><b>{edit.issue} — {edit.details || "sem detalhes"}</b></div>
            {edit.answer && (
              <div className="span-all"><span>Resposta do cliente</span><b>{edit.answer === "aceito" ? "Aceitou o orçamento" : "Recusou o orçamento"}</b></div>
            )}
          </div>
          {edit.photos?.length ? (
            <div className="field">
              <span>Fotos enviadas pelo cliente</span>
              <div className="photos">
                {edit.photos.map((src, i) => (
                  <a key={i} className="photo" href={src} target="_blank" rel="noreferrer"><img src={src} alt={`Foto ${i + 1}`} /></a>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid-2">
            <label className="field">
              <span>Status</span>
              <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as RepairStatus })}>
                {flow.map((s) => <option key={s} value={s}>{repairStatus[s].label}</option>)}
              </select>
            </label>
            <label className="field"><span>Orçamento (R$)</span><input type="number" min="0" step="0.01" value={edit.quote ?? ""} onChange={(e) => setEdit({ ...edit, quote: e.target.value ? +e.target.value : undefined })} /></label>
            <label className="field span-2"><span>Observação para o cliente</span><textarea value={edit.note ?? ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></label>
          </div>
        </Modal>
      )}
    </>
  );
}

export default definePlugin({
  id: "manutencao",
  name: "Pedidos de manutenção",
  routes: [{ path: "assistencia", element: <RepairPage />, nav: { label: "Assistência", order: 20 } }],
  admin: [
    {
      path: "assistencia",
      label: "Assistência",
      icon: Wrench,
      group: "Operação",
      order: 25,
      element: <RepairsAdmin />,
      badge: () => db.repairs.all().filter((r) => r.status === "recebido").length,
    },
  ],
});
