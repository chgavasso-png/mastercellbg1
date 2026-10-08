import { useEffect, useState } from "react";
import { ArrowRight, Download, Palette, Plus, ShoppingBag, Wrench } from "lucide-react";
import { definePlugin } from "@/core/plugins";
import { Card, PageHead } from "@/admin/kit";
import { Pulse } from "@/ui/Pulse";
import { toast } from "@/ui/Toast";

const tokens = ["--brand", "--brand-strong", "--accent", "--ink", "--night", "--surface"] as const;

const assets = [
  { file: "logo.png", label: "Logo principal", dark: true },
  { file: "icone.svg", label: "Ícone do app" },
  { file: "selo-garantia.svg", label: "Selo garantia" },
  { file: "selo-oferta.svg", label: "Selo oferta" },
  { file: "selo-assistencia.svg", label: "Selo conserto" },
  { file: "selo-pix.svg", label: "Selo Pix" },
  { file: "padrao-pulso.svg", label: "Padrão de fundo", pattern: true },
];

function Identity() {
  const [colors, setColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    setColors(Object.fromEntries(tokens.map((t) => [t, css.getPropertyValue(t).trim()])));
  }, []);

  return (
    <>
      <PageHead
        title="Identidade visual"
        subtitle="Cores extraídas do logo em assets/ e o kit de peças da marca. Troque a imagem e rode npm run palette para recalcular."
      />

      <div className="a-grid">
        <Card title="Paleta" className="span-12">
          <div className="swatch-grid">
            {tokens.map((t) => (
              <button
                key={t}
                className="swatch"
                onClick={() => { navigator.clipboard?.writeText(colors[t]).catch(() => undefined); toast(`${colors[t]} copiado`); }}
              >
                <i style={{ background: `var(${t})` }} />
                <b>{t.replace("--", "")}</b>
                <span className="faint">{colors[t]}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Botões" className="span-6">
          <div className="kit-row">
            <button className="btn primary lg">Comprar agora <ArrowRight /></button>
            <button className="btn lg">Ver vitrine</button>
            <button className="btn ghost lg">Saiba mais</button>
          </div>
          <div className="kit-row">
            <button className="btn primary"><ShoppingBag />Adicionar</button>
            <button className="btn soft"><Wrench />Orçamento</button>
            <button className="btn danger">Excluir</button>
            <button className="btn primary sm"><Plus />Novo</button>
          </div>
          <div className="kit-row dark">
            <button className="btn primary lg">Comprar agora <ArrowRight /></button>
            <button className="btn lg hero-ghost">Pedir assistência</button>
            <button className="add" aria-label="Adicionar"><Plus /></button>
          </div>
        </Card>

        <Card title="Etiquetas e status" className="span-6">
          <div className="kit-row">
            <span className="flag flag-off">-25%</span>
            <span className="flag">Últimas 3</span>
            <span className="flag flag-dark">Esgotado</span>
            <code className="code">MASTTER10</code>
          </div>
          <div className="kit-row">
            <span className="pill ok">Entregue</span>
            <span className="pill info">Pago</span>
            <span className="pill warn">Aguardando</span>
            <span className="pill bad">Cancelado</span>
            <span className="pill brand">Em reparo</span>
          </div>
          <div className="kit-row dark">
            <span className="brand-word">Mastter<b>Cell</b></span>
            <Pulse className="kit-pulse" />
          </div>
        </Card>

        <Card title="Peças da marca" className="span-12">
          <div className="asset-grid">
            {assets.map((a) => (
              <figure key={a.file} className={a.dark ? "dark" : ""}>
                <div style={a.pattern ? { background: `url(/brand/${a.file})` } : undefined}>
                  {!a.pattern && <img src={`/brand/${a.file}`} alt={a.label} />}
                </div>
                <figcaption>
                  <span><b>{a.label}</b><small className="faint">{a.file}</small></span>
                  <a className="icon-btn" href={`/brand/${a.file}`} download aria-label={`Baixar ${a.label}`}><Download /></a>
                </figcaption>
              </figure>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

export default definePlugin({
  id: "identidade",
  name: "Identidade visual",
  admin: [{ path: "identidade", label: "Identidade visual", icon: Palette, group: "Marketing", order: 70, element: <Identity /> }],
});
