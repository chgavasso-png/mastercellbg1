import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn } from "@/domain/services";
import type { AuthPhase } from "./AuthTransition";

const destinations = {
  admin: { path: "/admin", label: "o painel da loja" },
  customer: { path: "/conta", label: "sua conta" },
} as const;

/** Login com etapas visíveis: carregando → confirmado → redireciona conforme o tipo de conta. */
export function useSignIn() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<AuthPhase | null>(null);
  const [error, setError] = useState("");

  const submit = async (email: string, password: string) => {
    setError("");
    setPhase({ step: "loading" });
    try {
      const to = destinations[await signIn(email, password)];
      setPhase({ step: "done", to: to.label });
      await new Promise((r) => setTimeout(r, 900));
      navigate(to.path, { replace: true });
      setPhase(null);
    } catch (e) {
      setPhase(null);
      setError((e as Error).message);
    }
  };

  return { phase, error, setError, submit, busy: phase !== null };
}
