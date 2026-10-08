import { registerPlugin, type Plugin } from "./plugins";

export function loadPlugins() {
  const modules = import.meta.glob<{ default: Plugin }>("../plugins/*/index.tsx", { eager: true });
  Object.values(modules)
    .map((m) => m.default)
    .forEach(registerPlugin);
}
