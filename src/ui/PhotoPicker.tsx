import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { shrink } from "./ImagePicker";

/** Várias fotos pequenas (data URL), para o cliente mostrar o aparelho. */
export function PhotoPicker({ value, onChange, max = 4 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="photos">
      {value.map((src, i) => (
        <span key={i} className="photo">
          <img src={src} alt={`Foto ${i + 1}`} />
          <button type="button" aria-label="Remover foto" onClick={() => onChange(value.filter((_, j) => j !== i))}><X /></button>
        </span>
      ))}
      {value.length < max && (
        <button type="button" className="photo add" onClick={() => input.current?.click()}>
          <ImagePlus />Adicionar foto
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])].slice(0, max - value.length);
          e.target.value = "";
          onChange([...value, ...(await Promise.all(files.map((f) => shrink(f, 1024))))]);
        }}
      />
    </div>
  );
}
