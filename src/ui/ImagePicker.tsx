import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

export async function shrink(file: File, max = 720) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/webp", 0.85);
}

export function ImagePicker({ value, onChange, label = "Imagem" }: { value?: string; onChange: (v?: string) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="field">
      <span>{label}</span>
      <div className="picker">
        {value ? <img src={value} alt="" /> : <ImagePlus />}
        <div className="stack" style={{ gap: 8 }}>
          <div className="row">
            <button type="button" className="btn soft sm" onClick={() => input.current?.click()}>Enviar arquivo</button>
            {value && (
              <button type="button" className="btn danger sm" onClick={() => onChange(undefined)}><Trash2 />Remover</button>
            )}
          </div>
          <input
            className="input"
            placeholder="…ou cole a URL da imagem"
            value={value?.startsWith("data:") ? "" : value ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) onChange(await shrink(file));
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
