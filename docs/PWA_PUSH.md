# PWA + Web Push

> El portal LUMIA es instalable como PWA en home screen. Push
> notifications nativas reemplazan WhatsApp en clientes que las activan.
>
> Frontend: `frontend/src/app/manifest.ts`, `frontend/public/sw.js`,
> `frontend/src/components/PwaRegister.tsx`.
> Backend: tabla `push_subscriptions`,
> `app/Http/Common/Controllers/PushSubscriptionController.php`.

## Manifest

`/manifest.webmanifest` (servido por Next desde `app/manifest.ts`):

```ts
{
  name: "LUMIA — Software de barbería",
  short_name: "LUMIA",
  start_url: "/",
  display: "standalone",
  theme_color: "#1F3D2B",
  background_color: "#FBF7EE",
  icons: [{ src: "/icon-192.png", ... }, { src: "/icon-512.png", ... }],
}
```

**Pendiente**: generar `icon-192.png` y `icon-512.png` reales (hoy son
placeholders). Mientras no existan, la instalación PWA funciona pero el
icono cae en uno default del browser.

**TODO**: manifest dinámico por tenant (custom domain) — un route handler
en `/manifest.webmanifest` que detecte el `Host` y devuelva el branding
del tenant. Hoy todos comparten el manifest LUMIA neutral.

## Service worker

`public/sw.js` se registra automáticamente desde `<PwaRegister />` en
`layout.tsx` (sólo en production — evita interferir con HMR de Next dev).

### Strategies

- **APIs (`/api/...`)**: network-first, fallback a cache cuando offline.
- **Static assets (`/_next/static/`, fuentes, imágenes)**: cache-first.
- **HTML pages**: network-first.

### Versionado

`CACHE_VERSION = "lumia-v1"`. Cuando cambies algo importante (estructura
de cache, lógica), bumpea a `v2` — el activate handler borra todas las
caches que no empiezan por la versión nueva.

### Push handlers

```js
self.addEventListener("push", (event) => {
  const payload = event.data.json();
  self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/icon-192.png",
    data: { url: payload.url },
  });
});

self.addEventListener("notificationclick", (event) => {
  // Abre la URL del payload o foco a una ventana existente.
});
```

## Suscripción del cliente

Pseudocódigo desde una page React:

```tsx
const reg = await navigator.serviceWorker.ready;
const sub = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY_B64URL,
});
await fetch("/api/push/subscribe", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(sub.toJSON()),
});
```

El backend persiste `endpoint`, `p256dh_key`, `auth_key` en
`push_subscriptions` con UNIQUE `(user_id, endpoint)`. Si el user no está
autenticado (cliente público), se guarda con `user_id NULL` y `tenant_id`
si el contexto lo permite.

**Pendiente UI**: hoy NO hay UI para activar el opt-in. La integración
mínima sería un `<PushOptIn />` widget que aparezca:
- En `/admin` para que el admin reciba alertas (login nuevo, payment failed, ...).
- En `/r/<token>` después de calificar para "recibir recordatorios".

## Envío real (VAPID)

NO está implementado. Para activar push real necesitas:

1. **Generar VAPID keys**:
   ```bash
   php artisan tinker
   >>> // o https://vapidkeys.com/
   ```
2. Setear `VAPID_PUBLIC_KEY` (base64url) y `VAPID_PRIVATE_KEY` en env.
3. Implementar `App\Domain\Notifications\Services\SendPushNotification`:
   - Toma `subscription.endpoint`, `p256dh_key`, `auth_key`.
   - Cifra el payload con ECDH P-256 + HKDF + AES-GCM.
   - Firma JWT VAPID con el private key.
   - Hace POST al endpoint del browser (FCM/Mozilla/Apple).
   - El web-push protocol es complejo — recomendado usar `minishlink/web-push`
     (composer): `composer require minishlink/web-push-php`.
4. Wirearlo a eventos: `AppointmentBooked` → push al admin, etc.

Mientras no esté, el endpoint `/api/push/subscribe` funciona para que el
browser conceda permiso y guardemos el endpoint, pero el envío es no-op.

## Privacy

Las `push_subscriptions` se borran cuando:
- El user se borra (FK cascade).
- El browser cancela la suscripción y el backend recibe 410 Gone (TODO:
  el job de envío debería detectarlo y borrar la fila).
