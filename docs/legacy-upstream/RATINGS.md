# Calificaciones post-visita

> 24 h después de cada cita completada el cliente recibe un WhatsApp con
> link único `/r/<token>`. Califica 1-5★ + comentario opcional. El
> promedio publicado se muestra en `/b/<slug>` para reforzar elección
> del próximo cliente.

## Schema

```
ratings
├─ id
├─ tenant_id (uuid, indexed)
├─ appointment_id (FK + UNIQUE — una calificación por cita)
├─ user_id (cliente, nullable)
├─ barber_id (nullable — para promedio por barbero)
├─ stars (1..5; 0 = pendiente)
├─ comment (≤ 500 chars)
├─ public_token (40 chars random, UNIQUE)
├─ submitted_at
├─ is_published (default true para 4★+, false para 1-3★)
└─ timestamps
```

## Flujo

1. Cita se marca `completed` → evento `AppointmentCompleted`.
2. Listener `IssueRatingTokenOnCompletion`:
   - Crea `Rating` con `stars=0`, `submitted_at=null`, `public_token` random.
   - Manda WhatsApp template `post_visit_rating` con la URL
     `<frontend>/r/<token>`.
3. Cliente abre `/r/<token>`:
   - SSR carga estado (`GET /api/public/ratings/<token>`).
   - Si ya `submitted=true`, muestra "ya calificaste".
   - Si no, muestra UI de 5 estrellas + textarea.
4. Cliente envía → `POST /api/public/ratings/<token>` con `{stars, comment}`.
   - Marca `submitted_at = now()`.
   - `is_published = stars >= 4` (filtro automático para no inflar
     reviews negativas en el portal público — el admin las ve igual).

## Política "4★+ se publica"

Calificaciones de 1-3★ NO se publican en `/b/<slug>` por defecto. El
admin puede:

- Verlas todas en `/admin/ratings` (TODO: UI pendiente).
- Republicarlas manualmente si están justificadas.
- Responder al cliente directamente (TODO: feature de reply).

Esta política es controvertida — algunas reviews dicen que oculta
problemas reales. Alternativa más justa: publicar todas pero permitir al
admin **responder** públicamente (como Tripadvisor / Google Reviews).
Decisión actual: ocultar negativas, hasta que tengamos respuestas
públicas implementadas.

## Promedio público

`GET /api/client/tenants/<slug>` ahora incluye:

```json
"reputation": {
  "count": 47,
  "avg": 4.8,
  "highlights": [
    {"stars": 5, "comment": "Diego es un crack..."},
    ...
  ]
}
```

El frontend (`TenantHero` o sección "lo que dicen") consume esto. **Nota**:
esto se incluyó en `PublicTenantController` — hay que actualizar el cliente
público (`BookingFlow`) para mostrarlo en el hero. Pendiente.

## Anti-fraude

- Token de 40 chars random + UNIQUE → no se adivina.
- UNIQUE en `appointment_id` → un cliente no puede inflar 50★ desde
  N tabs distintas.
- `submitted_at` no-null → ya no acepta más POST.

## Pendientes

- UI admin `/admin/ratings` para ver todas (incluyendo no publicadas) +
  marcar/desmarcar como publicadas.
- Promedio por barbero en su ficha pública (los datos están en
  `ratings.barber_id`, falta query agregada y mostrarlo).
- Respuesta del admin al rating (campo `admin_reply` + `replied_at`).
- Filtros en BookingFlow: "ver sólo barberos con 4.5★+".
