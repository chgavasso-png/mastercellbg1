import { useState } from "react";
import { Download, EllipsisVertical, Share, SquarePlus } from "lucide-react";
import { Modal } from "./Modal";
import { useInstall } from "./install";
import { toast } from "./Toast";

/** Botão "Instalar app": abre a instalação do navegador ou mostra o passo a passo (iPhone e outros). */
export function InstallApp({ className = "", label = "Instalar app do painel" }: { className?: string; label?: string }) {
  const { can, install } = useInstall();
  const [help, setHelp] = useState(false);

  if (can === "installed") return null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={async () => {
          if (can === "prompt") {
            if (await install()) toast("App instalado! Ele abre direto no painel.");
          } else setHelp(true);
        }}
      >
        <Download />{label}
      </button>
      {help && (
        <Modal title="Instalar o app MasterCell" onClose={() => setHelp(false)}>
          <div className="install-help">
            <img src="/brand/app-192.png" alt="" width={72} height={72} />
            {can === "ios" ? (
              <ol>
                <li>Abra este site no <b>Safari</b>.</li>
                <li>Toque em <b>Compartilhar</b> <Share aria-label="ícone de compartilhar" /> na barra de baixo.</li>
                <li>Escolha <b>Adicionar à Tela de Início</b> <SquarePlus aria-label="ícone de adicionar" />.</li>
                <li>Toque em <b>Adicionar</b>. O ícone aparece junto com seus apps.</li>
              </ol>
            ) : (
              <ol>
                <li>Abra o menu do navegador <EllipsisVertical aria-label="ícone de menu" /> (os três pontinhos).</li>
                <li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li>
                <li>Confirme. O ícone MasterCell aparece junto com seus apps.</li>
              </ol>
            )}
            <p className="faint">O app abre direto no painel da loja, em tela cheia, com os avisos de novas OS e pedidos.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
