# Smart features

## Smart scheduling

`GET /api/admin/insights/smart-slots` agrega citas de las últimas 8
semanas y devuelve los 3 slots con menos visitas por barbero (proxy de
"hueco crónico").

```json
{
  "period_weeks": 8,
  "suggestions": [
    { "barber_id": 3, "weekday": 1, "hour": 16, "visits_8w": 0 },
    { "barber_id": 3, "weekday": 2, "hour": 11, "visits_8w": 1 }
  ]
}
```

UI `/admin/insights` muestra esto como tabla. **Acción operativa**:
crear cupón target a esos horarios (por ej. -20% lunes 16h con Diego)
para llenar la agenda.

## Stock predictivo

`GET /api/admin/insights/stock-forecast` (gated `feature:pos_inventory`):

```json
{
  "forecast": [
    {
      "id": 4,
      "name": "Pomada Mate",
      "stock": 8,
      "stock_min": 5,
      "sold_last_30d": 24,
      "per_day_avg": 0.8,
      "days_until_stockout": 10,
      "reorder_now": true
    }
  ]
}
```

Heurística: vendido_últimos_30d / 30 = velocidad/día → días = stock /
velocidad. Si días ≤ 14, marca `reorder_now`.

## Galería antes/después

Tabla `cut_gallery` con `client_consent` y `expires_at` (default +180
días si no es consent permanente). UI con upload S3 pendiente para el
siguiente sprint. Reglas:

- Subir foto requiere consent firmado del cliente (boolean).
- Sin consent permanente, la foto se borra a los 180 días.
- Sólo el admin puede `is_published = true`.
- El cliente puede solicitar borrado en cualquier momento desde `/me`.

## Predicciones más avanzadas (roadmap)

- **Probabilidad de no-show por cliente** (regresión logística sobre
  historial).
- **Cliente en riesgo de churn** (días desde última visita > N + servicio
  premium en su historial).
- **Sugerencias de servicio** ("clientes que pidieron Fade también
  llevaron Barba").
