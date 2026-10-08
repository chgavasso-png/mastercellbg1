// Service worker do app MasterCell: permite instalar e abrir sem internet (mostra a última versão).
// Dados (Supabase) nunca passam por aqui — são de outro domínio e sempre vêm frescos.
const VERSION = "mc-v2";
const SHELL = ["/", "/manifest.webmanifest", "/brand/app-192.png", "/brand/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const save = (key, res) => {
  if (res.ok) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(key, copy));
  }
  return res;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Páginas: sempre tenta a rede (versão nova); sem internet, abre a última salva.
  // O site é uma página só: se o servidor responder erro (ex.: 404 numa rota do app), usa a página salva.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => (res.ok ? save("/", res) : caches.match("/").then((hit) => hit || res)))
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Arquivos do build têm hash no nome: nunca mudam, podem vir do cache.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((res) => save(request, res))));
    return;
  }

  // Imagens da marca: responde do cache e atualiza por trás.
  if (url.pathname.startsWith("/brand/")) {
    event.respondWith(
      caches.match(request).then((hit) => {
        const fresh = fetch(request).then((res) => save(request, res));
        return hit || fresh;
      }),
    );
  }
});
