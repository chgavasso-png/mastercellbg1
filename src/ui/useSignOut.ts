import { useNavigate } from "react-router-dom";
import { signOut } from "@/domain/services";

/**
 * Sair sempre leva à página inicial da loja. Espera a navegação terminar antes de
 * limpar a sessão — senão a página atual (painel ou conta) troca para a tela de login no caminho.
 */
export function useSignOut() {
  const navigate = useNavigate();
  return async () => {
    await navigate("/", { replace: true });
    await signOut();
  };
}
