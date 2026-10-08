import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, LogOut, Package, User, Users, Wrench } from "lucide-react";
import { definePlugin } from "@/core/plugins";
import { useCollection } from "@/core/store";
import { db } from "@/domain/db";
import { registerCustomer, signIn, signOut, useCustomer } from "@/domain/services";
import type { Address, Customer } from "@/domain/types";
import { day, money, stamp } from "@/core/format";
import { Card, Kpi, PageHead, SearchBox, Table, matches, type Column } from "@/admin/kit";
import { Modal } from "@/ui/Modal";
import { Pulse } from "@/ui/Pulse";
import { Status, orderStatus, repairStatus } from "@/ui/status";
import { toast } from "@/ui/Toast";

const emptyAddress: Address = { street: "", district: "", city: "Barra do Garças", zip: "" };

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const maskCpf = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

function AuthForms() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"entrar" | "cadastro">("entrar");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [form, setForm] = useState({
    name: "", email: "", phone: "", document: "", birthday: "", password: "", confirm: "", marketing: true, address: emptyAddress,
  });

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth panel">
      <div className="tabs">
        <button className={mode === "entrar" ? "on" : ""} onClick={() => { setMode("entrar"); setError(""); }}>Entrar</button>
        <button className={mode === "cadastro" ? "on" : ""} onClick={() => { setMode("cadastro"); setError(""); }}>Criar conta</button>
      </div>

      {mode === "entrar" ? (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { if ((await signIn(login.email, login.password)) === "admin") navigate("/admin"); }); }}>
          <label className="field"><span>E-mail</span><input type="email" required autoComplete="email" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} /></label>
          <label className="field"><span>Senha</span><input type="password" required autoComplete="current-password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></label>
          {error && <small className="error">{error}</small>}
          <button className="btn primary lg block" disabled={busy}>Entrar</button>
          <p className="faint" style={{ textAlign: "center" }}>Primeira vez aqui? <button type="button" className="link" onClick={() => setMode("cadastro")}>Crie sua conta</button></p>
        </form>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.password.length < 6) return setError("A senha precisa de pelo menos 6 caracteres");
            if (form.password !== form.confirm) return setError("As senhas não conferem");
            const { confirm, ...data } = form;
            run(async () => {
              const customer = await registerCustomer(data);
              if (customer) toast(`Bem-vindo(a), ${form.name.split(" ")[0]}!`);
              else {
                setMode("entrar");
                setLogin({ email: form.email, password: "" });
                toast("Conta criada! Confirme pelo link que enviamos ao seu e-mail.");
              }
            });
          }}
        >
          <div className="grid-2">
            <label className="field span-2"><span>Nome completo</span><input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="field"><span>E-mail</span><input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="field"><span>WhatsApp</span><input required autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} placeholder="(66) 99999-9999" /></label>
            <label className="field"><span>CPF</span><input inputMode="numeric" value={form.document} onChange={(e) => setForm({ ...form, document: maskCpf(e.target.value) })} placeholder="000.000.000-00" /></label>
            <label className="field"><span>Nascimento</span><input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></label>
            <label className="field span-2"><span>Endereço</span><input autoComplete="street-address" value={form.address.street} onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })} placeholder="Rua e número" /></label>
            <label className="field"><span>Bairro</span><input value={form.address.district} onChange={(e) => setForm({ ...form, address: { ...form.address, district: e.target.value } })} /></label>
            <label className="field"><span>CEP</span><input autoComplete="postal-code" value={form.address.zip} onChange={(e) => setForm({ ...form, address: { ...form.address, zip: e.target.value } })} /></label>
            <label className="field"><span>Senha</span><input required type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <label className="field"><span>Confirme a senha</span><input required type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={form.marketing} onChange={(e) => setForm({ ...form, marketing: e.target.checked })} />Quero receber ofertas e novidades pelo WhatsApp</label>
          {error && <small className="error">{error}</small>}
          <button className="btn primary lg block" disabled={busy}>Criar minha conta</button>
        </form>
      )}
    </div>
  );
}

function AccountArea({ customer }: { customer: Customer }) {
  const orders = useCollection(db.orders).filter((o) => o.customerId === customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const repairs = useCollection(db.repairs).filter((r) => r.customerId === customer.id || (r.phone && r.phone === customer.phone));
  const [tab, setTab] = useState<"pedidos" | "assistencia" | "dados">("pedidos");
  const [data, setData] = useState(customer);

  return (
    <div className="account">
      <aside className="panel account-side">
        <span className="avatar xl">{customer.name[0]}</span>
        <b>{customer.name}</b>
        <span className="faint">{customer.email}</span>
        <nav>
          <button className={tab === "pedidos" ? "on" : ""} onClick={() => setTab("pedidos")}><Package />Meus pedidos <em>{orders.length}</em></button>
          <button className={tab === "assistencia" ? "on" : ""} onClick={() => setTab("assistencia")}><Wrench />Assistência <em>{repairs.length}</em></button>
          <button className={tab === "dados" ? "on" : ""} onClick={() => setTab("dados")}><User />Meus dados</button>
          <button onClick={signOut}><LogOut />Sair</button>
        </nav>
      </aside>

      <section className="panel">
        {tab === "pedidos" && (
          <>
            <h3>Meus pedidos</h3>
            {orders.length === 0 ? (
              <div className="empty"><Package /><p>Você ainda não fez pedidos.</p><Link to="/loja" className="btn primary">Ir às compras</Link></div>
            ) : (
              <ul className="order-cards">
                {orders.map((o) => (
                  <li key={o.id}>
                    <div className="row between wrap">
                      <div><b>Pedido {o.code}</b><span className="faint"> · {stamp(o.createdAt)}</span></div>
                      <Status map={orderStatus} value={o.status} />
                    </div>
                    <p className="muted">{o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}</p>
                    {o.tradeIn && (
                      <p className="faint">
                        Seu {o.tradeIn.device} na troca · {o.tradeIn.value ? `avaliado em ${money(o.tradeIn.value)}` : "aguardando avaliação"}
                      </p>
                    )}
                    <div className="row between">
                      <span className="faint">{o.delivery === "entrega" ? "Entrega em domicílio" : "Retirada na loja"}</span>
                      <b className="tabular">{money(o.total)}</b>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {tab === "assistencia" && (
          <>
            <h3>Minhas assistências</h3>
            {repairs.length === 0 ? (
              <div className="empty"><Wrench /><p>Nenhum conserto por aqui.</p><Link to="/assistencia" className="btn primary">Solicitar orçamento</Link></div>
            ) : (
              <ul className="order-cards">
                {repairs.map((r) => (
                  <li key={r.id}>
                    <div className="row between wrap"><b>{r.protocol} · {r.device}</b><Status map={repairStatus} value={r.status} /></div>
                    <p className="muted">{r.issue}{r.quote ? ` · orçamento ${money(r.quote)}` : ""}</p>
                    {r.note && <p className="faint">{r.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {tab === "dados" && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              db.customers.update(customer.id, { name: data.name, phone: data.phone, document: data.document, birthday: data.birthday, address: data.address, marketing: data.marketing });
              toast("Dados atualizados");
            }}
          >
            <h3>Meus dados</h3>
            <div className="grid-2">
              <label className="field span-2"><span>Nome</span><input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} /></label>
              <label className="field"><span>WhatsApp</span><input value={data.phone} onChange={(e) => setData({ ...data, phone: maskPhone(e.target.value) })} /></label>
              <label className="field"><span>CPF</span><input value={data.document ?? ""} onChange={(e) => setData({ ...data, document: maskCpf(e.target.value) })} /></label>
              <label className="field span-2"><span>Endereço</span><input value={data.address?.street ?? ""} onChange={(e) => setData({ ...data, address: { ...(data.address ?? emptyAddress), street: e.target.value } })} /></label>
              <label className="field"><span>Bairro</span><input value={data.address?.district ?? ""} onChange={(e) => setData({ ...data, address: { ...(data.address ?? emptyAddress), district: e.target.value } })} /></label>
              <label className="field"><span>CEP</span><input value={data.address?.zip ?? ""} onChange={(e) => setData({ ...data, address: { ...(data.address ?? emptyAddress), zip: e.target.value } })} /></label>
            </div>
            <label className="check"><input type="checkbox" checked={data.marketing} onChange={(e) => setData({ ...data, marketing: e.target.checked })} />Receber ofertas pelo WhatsApp</label>
            <button className="btn primary" style={{ justifySelf: "start" }}>Salvar alterações</button>
          </form>
        )}
      </section>
    </div>
  );
}

function AccountPage() {
  const customer = useCustomer();
  return (
    <>
      <section className="page-head">
        <Pulse className="hero-pulse" />
        <div className="wrap">
          <nav className="crumbs"><Link to="/">Início</Link>/<span>Minha conta</span></nav>
          <h1>{customer ? <>Olá, <em>{customer.name.split(" ")[0]}</em></> : <>Sua <em>conta</em></>}</h1>
          <p>{customer ? "Acompanhe pedidos, consertos e mantenha seus dados em dia." : "Entre ou cadastre-se para comprar mais rápido e acompanhar seus pedidos e consertos."}</p>
        </div>
      </section>
      <div className="wrap section" style={{ paddingTop: 40 }}>
        {customer ? <AccountArea customer={customer} /> : <AuthForms />}
      </div>
    </>
  );
}

function CustomersAdmin() {
  const customers = useCollection(db.customers);
  const orders = useCollection(db.orders).filter((o) => o.status !== "cancelado");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Customer | null>(null);

  const stats = (c: Customer) => {
    const list = orders.filter((o) => o.customerId === c.id);
    return { count: list.length, total: list.reduce((s, o) => s + o.total, 0), last: list.map((o) => o.createdAt).sort().pop() };
  };

  const rows = customers.filter((c) => c.email && matches(q, c.name, c.email, c.phone));

  const columns: Column<Customer>[] = [
    {
      key: "name",
      label: "Cliente",
      sort: (c) => c.name,
      render: (c) => (
        <div className="cell-main">
          <span className="avatar">{c.name[0]}</span>
          <div><b>{c.name}</b><span className="faint">{c.email}</span></div>
        </div>
      ),
    },
    { key: "phone", label: "WhatsApp", render: (c) => c.phone },
    { key: "orders", label: "Pedidos", align: "center", sort: (c) => stats(c).count, render: (c) => stats(c).count },
    { key: "total", label: "Total gasto", align: "right", sort: (c) => stats(c).total, render: (c) => <b className="tabular">{money(stats(c).total)}</b> },
    { key: "since", label: "Cliente desde", sort: (c) => c.createdAt, render: (c) => <span className="muted">{day(c.createdAt)}</span> },
    { key: "mkt", label: "Ofertas", align: "center", render: (c) => (c.marketing ? <span className="pill ok">sim</span> : <span className="pill">não</span>) },
  ];

  const exportCsv = () => {
    const lines = ["nome;email;whatsapp;pedidos;total;aceita_ofertas", ...rows.map((c) => {
      const s = stats(c);
      return [c.name, c.email, c.phone, s.count, s.total.toFixed(2).replace(".", ","), c.marketing ? "sim" : "nao"].join(";");
    })];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "clientes.csv";
    a.click();
  };

  const top = [...rows].sort((a, b) => stats(b).total - stats(a).total)[0];
  const current = open && customers.find((c) => c.id === open.id);

  return (
    <>
      <PageHead title="Clientes" subtitle="Cadastros feitos pelo site e no balcão." actions={<button className="btn ghost" onClick={exportCsv}><Download />Exportar CSV</button>} />
      <div className="kpis three">
        <Kpi label="Clientes cadastrados" value={rows.length} icon={Users} />
        <Kpi label="Aceitam ofertas" value={rows.filter((c) => c.marketing).length} hint="para campanhas no WhatsApp" />
        <Kpi tone="dark" label="Melhor cliente" value={top ? top.name.split(" ")[0] : "—"} hint={top ? money(stats(top).total) : undefined} />
      </div>
      <div className="a-toolbar"><SearchBox value={q} onChange={setQ} placeholder="Nome, e-mail ou telefone" /></div>
      <Card className="flush"><Table rows={rows} columns={columns} onRow={setOpen} /></Card>

      {current && (
        <Modal title={current.name} onClose={() => setOpen(null)}>
          <div className="detail-grid">
            <div><span>E-mail</span><b>{current.email}</b></div>
            <div><span>WhatsApp</span><b>{current.phone}</b></div>
            <div><span>CPF</span><b>{current.document || "—"}</b></div>
            <div><span>Pedidos</span><b>{stats(current).count}</b></div>
            <div><span>Total gasto</span><b>{money(stats(current).total)}</b></div>
            <div><span>Última compra</span><b>{stats(current).last ? day(stats(current).last!) : "—"}</b></div>
            {current.address?.street && <div className="span-all"><span>Endereço</span><b>{current.address.street} · {current.address.district} · {current.address.city}</b></div>}
          </div>
          <ul className="order-cards">
            {orders.filter((o) => o.customerId === current.id).slice(0, 5).map((o) => (
              <li key={o.id} className="row between"><span><b>{o.code}</b> <span className="faint">· {day(o.createdAt)}</span></span><Status map={orderStatus} value={o.status} /><b className="tabular">{money(o.total)}</b></li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  );
}

export default definePlugin({
  id: "clientes",
  name: "Cadastro de clientes",
  routes: [{ path: "conta", element: <AccountPage /> }],
  admin: [{ path: "clientes", label: "Clientes", icon: Users, group: "Marketing", order: 60, element: <CustomersAdmin /> }],
});
