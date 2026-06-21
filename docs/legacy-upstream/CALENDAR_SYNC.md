# Sincronización de calendario

> Dos rutas para que el barbero/admin vea sus citas en su calendario
> personal: **Google OAuth bidireccional** o **iCal feed read-only**.

## Google Calendar (OAuth 2.0)

### Setup en Google Cloud

1. Crear OAuth Client en console.cloud.google.com (tipo "Web application").
2. Authorized redirect URI:
   `https://api.lumia.app/api/admin/calendar/google/callback` (prod) y
   `http://localhost:8000/api/admin/calendar/google/callback` (dev).
3. Habilitar API "Google Calendar API".
4. Setear `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en el gestor de secrets.

### Flujo OAuth

1. Admin entra a `/admin/calendar` y pulsa **Conectar**.
2. Frontend llama `POST /api/admin/calendar/google/start`. Backend genera
   un `state` aleatorio, lo cachea (TTL 10 min) mapeando a user_id, y
   devuelve `authorize_url`.
3. Browser redirige a Google. Usuario aprueba scopes:
   - `calendar.events` (leer/escribir eventos)
   - `userinfo.email` (saber con qué cuenta se conectó)
4. Google redirige a `/api/admin/calendar/google/callback?code=&state=`.
   - Backend valida `state` (Cache::pull, single-use).
   - Intercambia `code` por `access_token` + `refresh_token`.
   - Persiste en `calendar_connections` (cifrado vía cast `encrypted`).
5. Redirige a `<frontend>/admin/calendar?connected=1`.

### Push de citas a Google

Hoy implementado: `GoogleOauthClient::upsertEvent()` y `deleteEvent()`.
Pendiente cablearlo al evento `AppointmentBooked` / `AppointmentCancelled`
con un Job dedicado (`SyncAppointmentToGoogle`). El pseudocódigo:

```php
// Listener: SyncAppointmentToGoogle
$conn = CalendarConnection::where('user_id', $appointment->barber->user_id)
    ->where('provider', 'google')
    ->where('is_active', true)
    ->first();
if (! $conn) return;

if ($conn->access_token_expires_at?->isPast()) {
    $tokens = $google->refreshToken($conn->refresh_token);
    $conn->update(['access_token' => $tokens['access_token'], ...]);
}

$externalId = CalendarExternalEvent::where(...)->value('external_id');
$id = $google->upsertEvent($conn->access_token, [
    'summary' => $appointment->service->name,
    'start' => $appointment->starts_at->toIso8601String(),
    ...
], $externalId);
```

### Refresh de tokens

`access_token` expira en 1 h. Cuando lo veamos vencido en
`upsertEvent`, llamar `refreshToken($conn->refresh_token)` y persistir
el nuevo. Si Google revoca el refresh (usuario quitó el permiso), marcar
`is_active=false` y notificar al admin.

## iCal feed (read-only)

Más simple — sin OAuth. Cada barbero tiene un `ical_feed_token` único en
`barbers.ical_feed_token`. Suscripción en

```
GET /api/ical/barber/<token>.ics
```

Devuelve un VCALENDAR con eventos de los próximos 60 días. Apple
Calendar / Outlook / cualquier cliente iCal puede consumirlo.

### Rotar el token

Si se filtra, el admin puede rotar el token desde la ficha del barbero
(TODO: UI). Esto invalida la URL anterior — cualquiera que la esté
usando dejará de ver actualizaciones.

## Pendientes

- Listener real `SyncAppointmentToGoogle` con queue + retries.
- UI rotar `ical_feed_token`.
- Refresh proactivo de tokens 5 min antes de vencer (job hourly).
- Soporte Outlook 365 (Microsoft Graph) — clase paralela `OutlookOauthClient`.
