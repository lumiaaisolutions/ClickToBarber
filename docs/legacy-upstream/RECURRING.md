# Citas recurrentes

Cliente con suscripción ("todos los 1ros sábados a las 10:00 con Diego").
Cada noche, un job materializa las próximas N citas concretas.

## Schema

```
appointment_recurrences
├─ id, tenant_id
├─ user_id, barber_id, service_id
├─ frequency: weekly | biweekly | monthly
├─ weekday (0-6, para weekly/biweekly)
├─ day_of_month (1-28, para monthly)
├─ time_local (HH:MM)
├─ starts_on, ends_on (opcional)
├─ last_materialized_at
├─ is_active
└─ timestamps
```

## Job materializador

`php artisan lumia:materialize-recurrences --days=21`

Para cada serie activa cuyo `starts_on <= today + 21d`:

1. Calcula las fechas que cumplen la regla en los próximos 21 días.
2. Para cada fecha, intenta `BookAppointment::execute()`. Si el slot ya
   está tomado (`SlotAlreadyBooked`), salta — útil cuando el cliente
   reagenda manualmente algunas y la serie sigue.
3. Actualiza `last_materialized_at`.

Programado en `routes/console.php` daily 05:00.

## API admin

Por ahora los endpoints CRUD se expondrán en sprint siguiente. Mientras
tanto, crear desde `tinker`:

```php
\App\Domain\Operations\Models\AppointmentRecurrence::create([
    'tenant_id'    => $tenant->id,
    'user_id'      => $client->id,
    'barber_id'    => 3,
    'service_id'   => 1,
    'frequency'    => 'weekly',
    'weekday'      => 6,           // sábado
    'time_local'   => '10:00',
    'starts_on'    => '2026-06-01',
    'is_active'    => true,
]);
```

## Edge cases

- Si el barbero está de vacaciones esa fecha, la cita se crea (no hay
  control de availability vs shifts — TODO).
- Si la cita queda en pasado (server timezone drift), se ignora.
- `ends_on` se respeta — past `ends_on` → no se crean más.
