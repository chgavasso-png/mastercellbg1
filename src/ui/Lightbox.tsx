import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";

/** Foto em tela cheia, por cima de qualquer modal. Setas/← → navegam, Esc fecha. */
export function Lightbox({ images, index, onIndex, onClose }: {
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const many = images.length > 1;
  const go = (step: number) => onIndex((index + step + images.length) % images.length);

  useEffect(() => {
    // Captura antes do Modal de baixo, para o Esc fechar só a foto.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && many) go(1);
      else if (e.key === "ArrowLeft" && many) go(-1);
      else return;
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal aria-label={`Foto ${index + 1} de ${images.length}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <img src={images[index]} alt={`Foto ${index + 1} de ${images.length}`} />
      <div className="lightbox-bar">
        {many && <span>{index + 1} / {images.length}</span>}
        <a className="icon-btn" href={images[index]} download={`foto-${index + 1}.webp`} aria-label="Baixar foto"><Download /></a>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X /></button>
      </div>
      {many && (
        <>
          <button className="icon-btn lightbox-nav prev" onClick={() => go(-1)} aria-label="Foto anterior"><ChevronLeft /></button>
          <button className="icon-btn lightbox-nav next" onClick={() => go(1)} aria-label="Próxima foto"><ChevronRight /></button>
        </>
      )}
    </div>,
    document.body,
  );
}
