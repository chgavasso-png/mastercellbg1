import { Fragment, type ReactNode } from "react";

/**
 * Formatação simples para descrições, sem HTML (nada do texto vira código):
 *   ## Título       → subtítulo
 *   - item / • item → lista
 *   **texto**       → negrito
 *   linha em branco → novo parágrafo
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) {
      blocks.push(<p key={blocks.length}>{para.flatMap((l, i) => (i ? [<br key={`b${i}`} />, ...inline(l)] : inline(l)))}</p>);
      para = [];
    }
    if (list.length) {
      blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
      list = [];
    }
  };

  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) flush();
    else if (/^#{1,3}\s+/.test(line)) {
      flush();
      blocks.push(<h4 key={blocks.length}>{inline(line.replace(/^#{1,3}\s+/, ""))}</h4>);
    } else if (/^[-•*]\s+/.test(line)) {
      if (para.length) flush();
      list.push(line.replace(/^[-•*]\s+/, ""));
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();

  return <div className={`rich ${className}`}>{blocks}</div>;
}
