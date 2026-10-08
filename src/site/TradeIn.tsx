import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Repeat, ShoppingBag, Smartphone } from "lucide-react";
import { useDocument } from "@/core/store";
import { db } from "@/domain/db";
import { addToCart, cart, tradeConditions, tradeOffer } from "@/domain/services";
import type { TradeIn } from "@/domain/types";
import { Modal } from "@/ui/Modal";
import { ProductArt } from "@/ui/ProductArt";
import { toast } from "@/ui/Toast";

const storages = ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"];

const empty: TradeIn = { device: "", storage: "128 GB", condition: "bom" };

export function TradeInOffer() {
  const { line } = useDocument(tradeOffer);
  const [step, setStep] = useState<"pergunta" | "usado">("pergunta");
  const [form, setForm] = useState<TradeIn>(empty);

  useEffect(() => {
    if (line) {
      setStep("pergunta");
      setForm(empty);
    }
  }, [line]);

  if (!line) return null;
  const product = db.products.get(line.productId);
  if (!product) return null;

  const close = () => tradeOffer.set({ line: undefined });

  const finish = (tradeIn?: TradeIn) => {
    addToCart(line.productId, line.color, line.qty);
    if (tradeIn) cart.set({ tradeIn });
    close();
    toast(tradeIn ? "Seu usado entrou na negociação" : `${product.name} no carrinho`);
  };

  return (
    <Modal title={step === "pergunta" ? "Quer dar seu celular na troca?" : "Conte sobre seu celular"} onClose={close}>
      {step === "pergunta" ? (
        <div className="trade">
          <div className="trade-hero">
            <div className="trade-phone old"><Smartphone /></div>
            <Repeat className="trade-arrow" />
            <div className="trade-phone new" style={{ "--tint": line.color ?? product.color } as React.CSSProperties}>
              <ProductArt category={product.category} color={line.color ?? product.color} imageUrl={product.imageUrl} />
            </div>
          </div>
          <p className="muted">
            Aceitamos aparelhos usados e até quebrados como entrada no <b>{product.name}</b>. A gente avalia e o
            valor é abatido do total — o restante você parcela em até 18x no boleto, 12x no cartão ou passa no Brasilcard.
          </p>
          <div className="trade-choices">
            <button className="trade-choice yes" onClick={() => setStep("usado")}>
              <Repeat />
              <span><b>Sim, quero dar meu celular de entrada</b><small>usado ou quebrado · avaliação sem compromisso</small></span>
              <ArrowRight />
            </button>
            <button className="trade-choice" onClick={() => finish()}>
              <ShoppingBag />
              <span><b>Não, só comprar</b><small>seguir para o carrinho</small></span>
              <ArrowRight />
            </button>
          </div>
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            finish({ ...form, device: form.device.trim() });
          }}
        >
          <div className="grid-2">
            <label className="field span-2">
              <span>Marca e modelo</span>
              <input required autoFocus placeholder="Ex.: iPhone 12, Galaxy S21" value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} />
            </label>
            <label className="field">
              <span>Armazenamento</span>
              <select value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })}>
                {storages.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Saúde da bateria (%)</span>
              <input type="number" min="1" max="100" placeholder="Opcional" value={form.battery ?? ""} onChange={(e) => setForm({ ...form, battery: e.target.value ? +e.target.value : undefined })} />
            </label>
          </div>
          <div className="field">
            <span>Estado do aparelho</span>
            <div className="trade-conditions">
              {(Object.keys(tradeConditions) as TradeIn["condition"][]).map((c) => (
                <button type="button" key={c} className={form.condition === c ? "on" : ""} onClick={() => setForm({ ...form, condition: c })}>
                  <b>{tradeConditions[c].label}</b>
                  <small>{tradeConditions[c].hint}</small>
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Algo mais que a gente deva saber?</span>
            <textarea placeholder="Acompanha caixa, carregador, já foi aberto…" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || undefined })} />
          </label>
          <p className="faint trade-note">O valor final é definido na avaliação do aparelho na loja e abatido do seu pedido.</p>
          <div className="row between">
            <button type="button" className="btn ghost" onClick={() => setStep("pergunta")}><ArrowLeft />Voltar</button>
            <button className="btn primary">Adicionar com troca <ArrowRight /></button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function TradeInSummary({ tradeIn, onRemove }: { tradeIn: TradeIn; onRemove?: () => void }) {
  return (
    <div className="trade-summary">
      <Repeat />
      <div>
        <b>Seu usado na troca</b>
        <span>{tradeIn.device} · {tradeIn.storage} · {tradeConditions[tradeIn.condition].label}</span>
        <small>Valor abatido após a avaliação na loja</small>
      </div>
      {onRemove && <button type="button" className="link" onClick={onRemove}>remover</button>}
    </div>
  );
}
