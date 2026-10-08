import { useNavigate } from "react-router-dom";
import { signOut } from "@/domain/services";

/**
 * Sair sempre leva à tela de login da loja (/conta), tanto do painel quanto da conta do cliente.
 * Navega antes de limpar a sessão — senão o painel troca para o login do admin no caminho.
 */
export function useSignOut() {
  const navigate = useNavigate();
  return async () => {
    await navigate("/conta", { replace: true });
    await signOut();
  };
}
