/* Panel The Nine Sport — caché básica del shell */
const CACHE = "nine-panel-v1";
const SHELL = [
  "./admin.html",
  "./css/styles.css",
  "./css/admin.css",
  "./js/config.js",
  "./js/admin.js",
  "./assets/logo.png",
  "./admin.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Solo caché del panel; no interceptar API de Supabase
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res && res.ok && url.pathname.match(/\.(html|css|js|png|jpg|webp|webmanifest)$/)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
