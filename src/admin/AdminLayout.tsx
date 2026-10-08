import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { ExternalLink, LayoutDashboard, LogOut, Menu, Puzzle, RotateCcw } from "lucide-react";
import { adminPages, plugins } from "@/core/plugins";
import { useDocument } from "@/core/store";
import { resetAll, session, store } from "@/domain/db";
import { signOut } from "@/domain/services";
import { isRemote } from "@/core/store";
import { Brand } from "@/site/Brand";
import { Modal } from "@/ui/Modal";
import { toast } from "@/ui/Toast";
import { AdminLogin } from "./AdminLogin";

export function AdminLayout() {
  const { admin, adminEmail } = useDocument(session);
  const info = useDocument(store);
  const [open, setOpen] = useState(false);
  const [about, setAbout] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  if (!admin) return <AdminLogin />;

  const pages = adminPages();
  const groups = [...new Set(pages.map((p) => p.group ?? "Outros"))];

  return (
    <div className={`admin${open ? " nav-open" : ""}`}>
      <aside className="a-side">
        <div className="a-side-top">
          <Brand to="/admin" />
        </div>
        <nav>
          <NavLink to="/admin" end><LayoutDashboard />Visão geral</NavLink>
          {groups.map((g) => (
            <div key={g} className="a-group">
              <span>{g}</span>
              {pages.filter((p) => (p.group ?? "Outros") === g).map((p) => {
                const badge = p.badge?.() ?? 0;
                return (
                  <NavLink key={p.path} to={`/admin/${p.path}`}>
                    <p.icon />
                    {p.label}
                    {badge > 0 && <em>{badge}</em>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="a-side-foot">
          <button onClick={() => setAbout(true)}><Puzzle />{plugins().length} módulos ativos</button>
          <Link to="/" target="_blank"><ExternalLink />Ver loja</Link>
          <button onClick={() => signOut()}><LogOut />Sair</button>
        </div>
      </aside>
      <div className="a-scrim" onClick={() => setOpen(false)} />
      <div className="a-main">
        <header className="a-top">
          <button className="icon-btn a-burger" onClick={() => setOpen(true)} aria-label="Menu"><Menu /></button>
          <span className="faint hide-sm a-date">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
          <div className="row" style={{ marginLeft: "auto" }}>
            <span className="a-user">
              <span className="avatar">{info.name[0]}</span>
              <span className="hide-sm">{adminEmail}</span>
            </span>
          </div>
        </header>
        <div className="a-content">
          <Outlet />
        </div>
      </div>

      {about && (
        <Modal title="Módulos instalados" onClose={() => setAbout(false)}
          footer={
            <button
              className="btn danger sm"
              onClick={async () => {
                if (isRemote() && !confirm("Isso grava os produtos, promoções e posts de exemplo no banco. Continuar?")) return;
                await resetAll();
                toast(isRemote() ? "Dados de exemplo importados" : "Dados de exemplo restaurados");
                setAbout(false);
              }}
            >
              <RotateCcw />{isRemote() ? "Importar vitrine de exemplo" : "Restaurar dados de exemplo"}
            </button>
          }>
          <ul className="plugin-list">
            {plugins().map((p) => (
              <li key={p.id}>
                <Puzzle />
                <div>
                  <b>{p.name}</b>
                  <span className="faint">{p.id} · v{p.version ?? "1.0.0"}</span>
                </div>
                <span className="pill ok">ativo</span>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}
