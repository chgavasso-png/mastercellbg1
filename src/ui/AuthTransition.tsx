import { CircleCheck } from "lucide-react";
import { Pulse } from "./Pulse";

export type AuthPhase = { step: "loading" } | { step: "done"; to: string };

/** Tela cheia entre o clique em "Entrar" e o redirecionamento. */
export function AuthTransition({ phase }: { phase: AuthPhase }) {
  const done = phase.step === "done";
  return (
    <div className="auth-transition" role="status" aria-live="polite">
      <div className="auth-transition-card">
        {done ? <CircleCheck className="auth-transition-ok" /> : <Pulse className="auth-transition-pulse" />}
        <b>{done ? "Login confirmado!" : "Entrando…"}</b>
        <span className="muted">{done ? `Redirecionando para ${phase.to}…` : "Conferindo seus dados"}</span>
      </div>
    </div>
  );
}

/** Mesmo visual, para quando a conta já está logada e só falta carregar. */
export function AuthLoading({ label = "Carregando sua conta…" }: { label?: string }) {
  return (
    <div className="auth-transition inline" role="status" aria-live="polite">
      <div className="auth-transition-card">
        <Pulse className="auth-transition-pulse" />
        <b>{label}</b>
      </div>
    </div>
  );
}
