import { Fragment, type ComponentType, type ReactNode } from "react";
type Icon = ComponentType<{ className?: string; size?: number }>;

export type SlotName =
  | "site.overlay"
  | "site.home.after-hero"
  | "site.home.end"
  | "site.product.aside"
  | "admin.dashboard.widgets";

export interface AdminPage {
  path: string;
  label: string;
  icon: Icon;
  element: ReactNode;
  group?: "Operação" | "Vitrine" | "Financeiro" | "Clientes" | string;
  order?: number;
  badge?: () => number;
}

export interface SiteRoute {
  path: string;
  element: ReactNode;
  nav?: { label: string; order?: number };
}

export interface Plugin {
  id: string;
  name: string;
  version?: string;
  admin?: AdminPage[];
  routes?: SiteRoute[];
  slots?: Partial<Record<SlotName, ComponentType[]>>;
  setup?: () => void | (() => void);
}

export const definePlugin = (plugin: Plugin) => plugin;

const registry: Plugin[] = [];

export function registerPlugin(plugin: Plugin) {
  if (registry.some((p) => p.id === plugin.id)) return;
  registry.push(plugin);
  plugin.setup?.();
}

export const plugins = () => registry;

export const adminPages = () =>
  registry.flatMap((p) => p.admin ?? []).sort((a, b) => (a.order ?? 50) - (b.order ?? 50));

export const siteRoutes = () => registry.flatMap((p) => p.routes ?? []);

export const siteNav = () =>
  siteRoutes()
    .filter((r) => r.nav)
    .sort((a, b) => (a.nav!.order ?? 50) - (b.nav!.order ?? 50));

export function Slot({ name }: { name: SlotName }) {
  const parts = registry.flatMap((p) => p.slots?.[name] ?? []);
  return (
    <>
      {parts.map((Part, i) => (
        <Fragment key={i}>
          <Part />
        </Fragment>
      ))}
    </>
  );
}
