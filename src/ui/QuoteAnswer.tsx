import { useState } from "react";
import { Check, X } from "lucide-react";
import { answerQuote } from "@/domain/services";
import type { Repair } from "@/domain/types";
import { money } from "@/core/format";
import { toast } from "./Toast";

/** Botões para o cliente aceitar ou recusar o orçamento de uma OS. */
export function QuoteAnswer({ repair }: { repair: Pick<Repair, "protocol" | "status" | "quote" | "answer"> }) {
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState(repair.answer);

  if (answer === "aceito") return <p className="quote-answer ok"><Check />Você aceitou o orçamento. Já vamos começar o conserto.</p>;
  if (answer === "recusado") return <p className="quote-answer bad"><X />Você recusou o orçamento. A loja vai entrar em contato.</p>;
  if (repair.status !== "orcamento" || !repair.quote) return null;

  const reply = async (accept: boolean) => {
    if (!accept && !confirm("Recusar o orçamento?")) return;
    setBusy(true);
    try {
      await answerQuote(repair.protocol, accept);
      setAnswer(accept ? "aceito" : "recusado");
      toast(accept ? "Orçamento aceito!" : "Orçamento recusado");
    } catch (e) {
      toast(`Não foi possível responder — ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="quote-answer">
      <span>Orçamento de <b>{money(repair.quote)}</b> aguardando sua resposta</span>
      <div className="row">
        <button type="button" className="btn primary sm" disabled={busy} onClick={() => reply(true)}><Check />Aceitar</button>
        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => reply(false)}><X />Recusar</button>
      </div>
    </div>
  );
}
