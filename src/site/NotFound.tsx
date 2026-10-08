import { Link } from "react-router-dom";
import { Pulse } from "@/ui/Pulse";

export function NotFound() {
  return (
    <div className="wrap not-found">
      <Pulse className="nf-pulse" strokeWidth={5} />
      <h1>404</h1>
      <p className="muted">Essa página ficou sem sinal.</p>
      <Link to="/" className="btn primary lg">Voltar ao início</Link>
    </div>
  );
}
