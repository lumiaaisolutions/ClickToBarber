# Mini portal del cliente final (`/me`)

Sin password — el cliente entra por magic link al email. Cada link
dura 30 minutos y permite:

- Ver historial de citas (próximas + completadas).
- Ver visitas acreditadas en loyalty.
- Ver recompensas activas (códigos para mostrar en caja).
- Ver y compartir su código de referido.
- **Descargar todos sus datos** (GDPR Art. 15 / LFPDPPP Art. 22).
- **Eliminar su cuenta** (anonimización inmediata).

## Endpoints

- `POST /api/public/me/login { email, tenant_slug }` → emite magic link
  por email (siempre 200, no revela si existe el email).
- `POST /api/public/me/consume { token }` → bundle de datos.
- `POST /api/public/me/data-export { token }` → JSON descargable
  (Content-Disposition: attachment).
- `POST /api/public/me/data-deletion { token, confirm: "DELETE" }` →
  anonimiza al user (nombre/email/phone/notes a placeholder, soft delete).

## Frontend

`frontend/src/app/me/page.tsx` con `ClientPortalClient`. Soporta dos
flujos:

1. Sin token (`/me`): formulario para pedir link.
2. Con token (`/me?token=xxx&slug=xxx`): consume y muestra dashboard.

## Anonimización

Al borrar:
- `users.name = "Cliente eliminado"`
- `users.email = "deleted-{id}@anonymized.invalid"`
- `users.phone = NULL`
- `users.notes = NULL`
- `softDelete()` mantiene la fila para preservar audit trail.

Las citas, ratings y recompensas siguen apuntando al `user_id` pero
ya no contienen PII recuperable.

## Por qué no password

- Reduce fricción de retención: cliente no recuerda otro password más.
- Magic link via email cumple SOC2 "factor de autenticación".
- Ataque por enumeración mitigado: respuesta siempre 200, mensaje
  genérico.
- 30 min TTL = corto para impedir email comprometido > meses atrás.
