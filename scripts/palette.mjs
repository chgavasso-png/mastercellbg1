import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { Vibrant } from "node-vibrant/node";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const assets = join(root, "assets");
const target = join(root, "src", "styles", "palette.css");
const images = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const fallback = {
  brand: "#fcd404",
  brandStrong: "#131f7b",
  accent: "#9ca4d0",
  accentSoft: "#e1e4f1",
  ink: "#0b1240",
  surface: "#f6f7fb",
};

const hexToRgb = (hex) => hex.match(/\w\w/g).map((v) => parseInt(v, 16));
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const mix = (a, b, t) =>
  "#" + hexToRgb(a).map((v, i) => Math.round(v + (hexToRgb(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");

async function fromImage() {
  const files = await readdir(assets).catch(() => []);
  const file = files.find((f) => images.has(extname(f).toLowerCase()));
  if (!file) return null;

  const p = await Vibrant.from(join(assets, file)).getPalette();
  const pick = (...keys) => keys.map((k) => p[k]?.hex).find(Boolean);

  const brand = pick("Vibrant", "Muted", "DarkVibrant") ?? fallback.brand;
  const ink = pick("DarkVibrant", "DarkMuted") ?? fallback.ink;
  const accent = pick("LightVibrant", "Muted") ?? fallback.accent;

  return {
    source: file,
    colors: {
      brand,
      brandStrong: pick("DarkVibrant") ?? mix(brand, "#000000", 0.35),
      accent,
      accentSoft: mix(accent, "#ffffff", 0.7),
      ink: mix(ink, "#000000", 0.45),
      surface: mix(pick("LightMuted", "LightVibrant") ?? fallback.surface, "#ffffff", 0.9),
    },
  };
}

const result = await fromImage();
const c = result?.colors ?? fallback;
const onBrand = luminance(c.brand) > 0.45 ? c.ink : "#ffffff";

const css = `:root {
  --brand: ${c.brand};
  --brand-strong: ${c.brandStrong};
  --brand-soft: ${mix(c.brand, "#ffffff", 0.86)};
  --on-brand: ${onBrand};
  --accent: ${c.accent};
  --accent-soft: ${c.accentSoft};
  --ink: ${c.ink};
  --ink-2: ${mix(c.ink, "#ffffff", 0.3)};
  --ink-3: ${mix(c.ink, "#ffffff", 0.55)};
  --night: ${mix(c.brandStrong, "#000000", 0.62)};
  --night-2: ${mix(c.brandStrong, "#000000", 0.38)};
  --surface: ${c.surface};
  --surface-2: ${mix(c.surface, c.brand, 0.06)};
  --line: ${mix(c.surface, c.ink, 0.12)};
}
`;

await mkdir(join(root, "src", "styles"), { recursive: true });
await writeFile(target, css);
console.log(result ? `palette ← assets/${result.source}` : "palette ← default");
