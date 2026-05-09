/**
 * LUMIA service worker.
 *
 * Funciones:
 *  - Skip-waiting + claim → activación inmediata tras update.
 *  - Cache-first para shell estático (chunk URLs, /icon-*.png, fuentes).
 *  - Network-first para HTML y APIs.
 *  - Recibe push events del backend y muestra notificación nativa.
 *  - Click en notificación → abre la URL del payload (default /admin).
 */

const CACHE_VERSION = "lumia-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(["/", "/icon-192.png", "/icon-512.png"]).catch(() => null),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Solo manejamos same-origin GET; el resto pasa derecho.
  if (url.origin !== self.location.origin || event.request.method !== "GET") return;

  // APIs: network-first, fallback a cache si offline.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Assets de _next/static, fuentes, imágenes: cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(woff2?|otf|png|jpg|jpeg|webp|svg|ico|css|js)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Páginas HTML: network-first (mantener fresco), fallback a cache.
  event.respondWith(networkFirst(event.request));
});

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    return cached || Response.error();
  }
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

// ---- Web Push ----
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "LUMIA", body: event.data.text() };
  }

  const title = payload.title || "LUMIA";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/" },
    tag: payload.tag || undefined,
    renotify: !!payload.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
