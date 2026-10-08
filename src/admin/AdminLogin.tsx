import { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Pulse } from "@/ui/Pulse";
import { AuthTransition } from "@/ui/AuthTransition";
import { useSignIn } from "@/ui/useSignIn";

export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useSignIn();
  const { error, busy } = login;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login.submit(email, password);
  };

  return (
    <div className="a-login">
      <Pulse className="a-login-pulse" />
      <form onSubmit={submit} className="a-login-card">
        <img src="/brand/logo.png" alt="Mastter Cell" />
        <div>
          <h1>Painel da loja</h1>
          <p className="muted">Entre para gerenciar vitrine, vendas e assistência.</p>
        </div>
        <label className="field">
          <span>E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          <span>Senha</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <small className="error">{error}</small>}
        <button className="btn primary lg block" disabled={busy}><Lock />{busy ? "Entrando…" : "Entrar"} <ArrowRight /></button>
      </form>
      {login.phase && <AuthTransition phase={login.phase} />}
    </div>
  );
}
