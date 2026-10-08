import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/** Botão que abre um painel flutuante; fecha ao clicar fora, com Esc ou ao trocar de página. */
export function Dropdown({ button, label, onOpen, children, className = "" }: {
  button: ReactNode;
  label: string;
  onOpen?: () => void;
  children: (close: () => void) => ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <button
        type="button"
        className="icon-btn cart-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}
      >
        {button}
      </button>
      {open && <div className="dropdown-panel">{children(() => setOpen(false))}</div>}
    </div>
  );
}
