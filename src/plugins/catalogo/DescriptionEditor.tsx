import { useRef, useState } from "react";
import { Bold, Eye, GripVertical, Heading, List, Pencil, Plus, Sparkles, X } from "lucide-react";
import type { Category, Product } from "@/domain/types";
import { categoryLabel } from "@/domain/db";
import { RichText } from "@/ui/RichText";

type Fields = Pick<Product, "description" | "highlights" | "details" | "specs" | "inBox" | "warranty" | "category">;

/** Campos sugeridos da ficha técnica por categoria. */
const specTemplates: Record<Category, string[]> = {
  celulares: ["Tela", "Processador", "Memória RAM", "Armazenamento", "Câmera traseira", "Câmera frontal", "Bateria", "Carregamento", "Sistema", "Conectividade", "Chip"],
  capinhas: ["Compatível com", "Material", "Proteção", "MagSafe", "Acabamento"],
  peliculas: ["Compatível com", "Tipo", "Dureza", "Cobertura", "Acabamento"],
  carregadores: ["Potência", "Entrada", "Saída", "Cabo incluso", "Compatível com"],
  fones: ["Conexão", "Bateria", "Cancelamento de ruído", "Resistência à água", "Microfone"],
  acessorios: ["Material", "Compatível com", "Dimensões", "Peso"],
};

const boxTemplates: Partial<Record<Category, string[]>> = {
  celulares: ["Aparelho", "Cabo USB-C", "Ferramenta para chip", "Manual"],
  carregadores: ["Carregador", "Cabo"],
  fones: ["Fones", "Estojo de carregamento", "Cabo de carga"],
};

const defaultWarranty: Record<Category, string> = {
  celulares: "12 meses de garantia do fabricante + nota fiscal",
  capinhas: "90 dias contra defeitos de fabricação",
  peliculas: "90 dias contra defeitos de fabricação",
  carregadores: "6 meses de garantia",
  fones: "6 meses de garantia",
  acessorios: "90 dias contra defeitos de fabricação",
};

/** Lista de linhas curtas (destaques, itens da caixa). Enter adiciona; dá para reordenar arrastando. */
function LinesEditor({ value, onChange, placeholder, max = 12 }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; max?: number }) {
  const [draft, setDraft] = useState("");
  const [drag, setDrag] = useState<number | null>(null);
  const add = () => {
    const v = draft.trim();
    if (!v || value.length >= max) return;
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="lines-editor">
      {value.length > 0 && (
        <ul>
          {value.map((line, i) => (
            <li
              key={`${line}-${i}`}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag === null || drag === i) return;
                const next = [...value];
                const [moved] = next.splice(drag, 1);
                next.splice(i, 0, moved);
                onChange(next);
                setDrag(null);
              }}
            >
              <GripVertical className="grip" />
              <input value={line} onChange={(e) => onChange(value.map((l, j) => (j === i ? e.target.value : l)))} aria-label={`Item ${i + 1}`} />
              <button type="button" className="icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover"><X /></button>
            </li>
          ))}
        </ul>
      )}
      {value.length < max && (
        <div className="row" style={{ gap: 6 }}>
          <input
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <button type="button" className="btn soft sm" onClick={add} disabled={!draft.trim()}><Plus />Adicionar</button>
        </div>
      )}
    </div>
  );
}

/** Ficha técnica: pares "característica → valor". */
function SpecsEditor({ value, onChange, category }: { value: { label: string; value: string }[]; onChange: (v: { label: string; value: string }[]) => void; category: Category }) {
  const template = specTemplates[category];
  const missing = template.filter((t) => !value.some((s) => s.label.toLowerCase() === t.toLowerCase()));
  return (
    <div className="specs-editor">
      {value.map((s, i) => (
        <div key={i} className="specs-row">
          <input value={s.label} placeholder="Característica" onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Característica" />
          <input value={s.value} placeholder="Valor" onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} aria-label={`Valor de ${s.label || "característica"}`} />
          <button type="button" className="icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover linha"><X /></button>
        </div>
      ))}
      <div className="row wrap" style={{ gap: 6 }}>
        <button type="button" className="btn soft sm" onClick={() => onChange([...value, { label: "", value: "" }])}><Plus />Linha</button>
        {missing.length > 0 && (
          <button type="button" className="btn ghost sm" onClick={() => onChange([...value, ...missing.map((label) => ({ label, value: "" }))])}>
            <Sparkles />Usar modelo ({missing.length} campos)
          </button>
        )}
      </div>
    </div>
  );
}

/** Texto longo com mini barra de formatação e pré-visualização. */
function DetailsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const wrap = (kind: "bold" | "title" | "list") => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = value.slice(a, b);
    let next: string;
    let cursor: number;
    if (kind === "bold") {
      const text = sel || "texto em destaque";
      next = `${value.slice(0, a)}**${text}**${value.slice(b)}`;
      cursor = a + text.length + 4;
    } else {
      // aplica no início de cada linha selecionada
      const start = value.lastIndexOf("\n", a - 1) + 1;
      const block = value.slice(start, b) || (kind === "title" ? "Título" : "Item");
      const prefix = kind === "title" ? "## " : "- ";
      const done = block.split("\n").map((l) => (l.startsWith(prefix) ? l : prefix + l.replace(/^(##\s+|-\s+)/, ""))).join("\n");
      next = value.slice(0, start) + done + value.slice(Math.max(b, start));
      cursor = start + done.length;
    }
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="details-editor">
      <div className="details-bar">
        <button type="button" onClick={() => wrap("title")} disabled={preview} title="Subtítulo"><Heading />Título</button>
        <button type="button" onClick={() => wrap("bold")} disabled={preview} title="Negrito"><Bold />Negrito</button>
        <button type="button" onClick={() => wrap("list")} disabled={preview} title="Lista"><List />Lista</button>
        <span style={{ flex: 1 }} />
        <button type="button" className={preview ? "on" : ""} onClick={() => setPreview(!preview)}>{preview ? <><Pencil />Editar</> : <><Eye />Pré-visualizar</>}</button>
      </div>
      {preview ? (
        <div className="details-preview">{value.trim() ? <RichText text={value} /> : <p className="faint">Nada escrito ainda.</p>}</div>
      ) : (
        <textarea
          ref={ref}
          rows={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={"Conte tudo sobre o produto: para quem é, diferenciais, como usar…\n\n## Por que escolher\n- Bateria que dura o dia todo\n- **Tela de 120 Hz** muito fluida"}
        />
      )}
    </div>
  );
}

/** Bloco completo de descrição do produto no cadastro. */
export function DescriptionEditor<T extends Fields>({ value, onChange }: { value: T; onChange: (v: T) => void }) {
  const set = <K extends keyof Fields>(key: K, v: Fields[K]) => onChange({ ...value, [key]: v });
  const summary = value.description ?? "";

  return (
    <div className="desc-editor span-2">
      <label className="field">
        <span>Resumo <small className="faint">— aparece logo abaixo do nome ({summary.length}/180)</small></span>
        <input maxLength={180} value={summary} placeholder="Uma frase que venda o produto" onChange={(e) => set("description", e.target.value)} />
      </label>

      <div className="field">
        <span>Destaques <small className="faint">— os pontos fortes, um por linha</small></span>
        <LinesEditor value={value.highlights ?? []} onChange={(v) => set("highlights", v)} placeholder="Ex.: Câmera de 50 MP com estabilização" max={8} />
      </div>

      <div className="field">
        <span>Descrição completa</span>
        <DetailsEditor value={value.details ?? ""} onChange={(v) => set("details", v)} />
      </div>

      <div className="field">
        <span>Ficha técnica</span>
        <SpecsEditor value={value.specs ?? []} onChange={(v) => set("specs", v)} category={value.category} />
      </div>

      <div className="grid-2">
        <div className="field">
          <span>O que vem na caixa</span>
          <LinesEditor value={value.inBox ?? []} onChange={(v) => set("inBox", v)} placeholder="Ex.: Cabo USB-C" />
          {!value.inBox?.length && boxTemplates[value.category] && (
            <button type="button" className="link" style={{ justifySelf: "start", fontSize: 13 }} onClick={() => set("inBox", boxTemplates[value.category]!)}>
              Usar itens comuns de {categoryLabel(value.category).toLowerCase()}
            </button>
          )}
        </div>
        <label className="field">
          <span>Garantia</span>
          <input value={value.warranty ?? ""} placeholder={defaultWarranty[value.category]} onChange={(e) => set("warranty", e.target.value)} />
          {!value.warranty && (
            <button type="button" className="link" style={{ justifySelf: "start", fontSize: 13 }} onClick={() => set("warranty", defaultWarranty[value.category])}>
              Usar “{defaultWarranty[value.category]}”
            </button>
          )}
        </label>
      </div>
    </div>
  );
}

/** Remove linhas vazias antes de salvar. */
export function cleanDescription<T extends Partial<Fields>>(p: T): T {
  const lines = (l?: string[]) => {
    const v = (l ?? []).map((x) => x.trim()).filter(Boolean);
    return v.length ? v : undefined;
  };
  const specs = (p.specs ?? []).map((s) => ({ label: s.label.trim(), value: s.value.trim() })).filter((s) => s.label && s.value);
  return {
    ...p,
    description: (p.description ?? "").trim(),
    highlights: lines(p.highlights),
    inBox: lines(p.inBox),
    specs: specs.length ? specs : undefined,
    details: p.details?.trim() || undefined,
    warranty: p.warranty?.trim() || undefined,
  };
}
