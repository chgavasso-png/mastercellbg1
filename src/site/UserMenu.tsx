import { Link } from "react-router-dom";
import { LayoutDashboard, LogOut, Package, User, Wrench } from "lucide-react";
import { useDocument } from "@/core/store";
import { session } from "@/domain/db";
import { useCustomer } from "@/domain/services";
import { useSignOut } from "@/ui/useSignOut";
import { Dropdown } from "@/ui/Dropdown";

/** Ícone de usuário no topo: sem login leva para entrar; logado abre o menu da conta. */
export function UserMenu() {
  const customer = useCustomer();
  const { admin, adminEmail } = useDocument(session);
  const signOut = useSignOut();

  if (!customer && !admin)
    return <Link to="/conta" className="icon-btn" aria-label="Entrar" title="Entrar"><User /></Link>;

  const name = customer?.name ?? "Administrador";
  const out = async (close: () => void) => {
    close();
    await signOut();
  };

  return (
    <Dropdown label="Menu da conta" button={<span className="avatar">{name[0]}</span>}>
      {(close) => (
        <div className="user-menu">
          <div className="user-menu-head">
            <b>{name}</b>
            <span className="faint">{customer?.email ?? adminEmail}</span>
          </div>
          {admin && <Link to="/admin"><LayoutDashboard />Painel da loja</Link>}
          {customer && (
            <>
              <Link to="/conta?aba=pedidos"><Package />Meus pedidos</Link>
              <Link to="/conta?aba=assistencia"><Wrench />Minhas assistências</Link>
              <Link to="/conta?aba=dados"><User />Meus dados</Link>
            </>
          )}
          <button onClick={() => out(close)}><LogOut />Sair</button>
        </div>
      )}
    </Dropdown>
  );
}
