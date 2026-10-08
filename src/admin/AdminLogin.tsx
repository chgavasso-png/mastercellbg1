import { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signIn } from "@/domain/services";
import { Pulse } from "@/ui/Pulse";

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if ((await signIn(email, password)) === "customer") navigate("/conta");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
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
    </div>
  );
}
