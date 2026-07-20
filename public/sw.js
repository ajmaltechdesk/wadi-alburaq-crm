/* Wadi Al Buraq CRM — minimal offline-first service worker.
   Firestore handles data sync via its own persistent cache;
   this SW caches the app shell so the PWA opens offline. */
const CACHE = "wadi-crm-v1";
const SHELL = ["/", "/dashboard", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Never intercept Firebase/Google APIs
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && (url.pathname.startsWith("/_next/static") || SHELL.includes(url.pathname))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit ?? caches.match("/")))
  );
});
