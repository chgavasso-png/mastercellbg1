import { useSyncExternalStore } from "react";

/** Evento do Chrome/Edge/Android que deixa abrir o "Instalar app" quando quisermos. */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const standalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

let installed = standalone();

// Escuta desde o carregamento: o evento pode chegar antes de qualquer botão existir.
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e as InstallEvent;
  emit();
});
window.addEventListener("appinstalled", () => {
  deferred = null;
  installed = true;
  emit();
});

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sem SW o site funciona normalmente, só não abre offline */
    });
  });
}

/**
 * - prompt: o navegador deixa abrir a instalação direto
 * - ios: iPhone/iPad — Compartilhar → Adicionar à Tela de Início
 * - manual: outros navegadores — pelo menu do navegador
 * - installed: já está aberto como app
 */
export type InstallMode = "prompt" | "ios" | "manual" | "installed";

const read = (): InstallMode => (installed ? "installed" : deferred ? "prompt" : isIos() ? "ios" : "manual");

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useInstall() {
  const can = useSyncExternalStore(subscribe, read, read);
  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    emit();
    return outcome === "accepted";
  };
  return { can, install };
}
