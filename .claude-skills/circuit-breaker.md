# Skill: Circuit Breaker (Redis) — BarberPro

> Skill cargable por Claude Code. Define el patrón Circuit Breaker que envuelve TODA llamada a una integración externa (WhatsApp Cloud API, Stripe, MercadoPago, Twilio Voice). Su objetivo: aislar fallos de terceros para que **no degraden la experiencia del usuario ni saturen el sistema con reintentos inútiles**.

---

## 1. Cuándo aplicar este Skill

Aplica este skill **siempre** que se introduzca o modifique código que:

- Llame a una API HTTP de un proveedor externo.
- Use un SDK que internamente haga I/O hacia un tercero.
- Haga una operación cuya latencia o disponibilidad **no controlamos**.

❌ No aplica a llamadas internas (otro microservicio nuestro detrás del Kong) — eso usa retry + timeout, no circuit breaker.

---

## 2. Modelo de Estados

El circuito tiene tres estados, persistidos en Redis con TTL:

```
        ┌──────────────────────── falla #threshold ─────────────────────┐
        │                                                                ▼
   ┌─────────┐    éxito     ┌──────────┐    timeout cooldown     ┌──────────┐
   │ CLOSED  │ ───────────▶ │ CLOSED   │ ◀────────────────────── │   OPEN   │
   │ (sano)  │              │ (sano)   │                         │ (caído)  │
   └─────────┘              └──────────┘                         └──────────┘
        ▲                                                             │
        │ N éxitos consecutivos                                       │ tras `cooldown`
        │ en HALF_OPEN                                                ▼
        │                                                       ┌─────────────┐
        └────────────────────────────────────────────────────── │  HALF_OPEN  │
                              fallo en HALF_OPEN  ─────────▶   │  (probando) │
                              vuelve a OPEN                    └─────────────┘
```

### 2.1 Reglas de transición

| Desde | Evento | Hacia |
|-------|--------|-------|
| CLOSED | `failure_count >= failure_threshold` (5 por defecto) dentro de `failure_window` (60s) | OPEN |
| CLOSED | éxito | CLOSED (resetea contador) |
| OPEN | transcurre `cooldown` (30s por defecto) | HALF_OPEN |
| OPEN | request | **Rechazado inmediatamente** sin tocar el proveedor |
| HALF_OPEN | éxito de prueba | sumar a `success_count`. Si llega a `success_threshold` (2 por defecto) → CLOSED |
| HALF_OPEN | fallo de prueba | OPEN (renueva cooldown) |
| HALF_OPEN | request adicional mientras se prueba | rechazado (solo 1 prueba en vuelo) |

---

## 3. Configuración por Integración

```php
// config/circuit-breaker.php
return [
    'integrations' => [
        'whatsapp' => [
            'failure_threshold' => 5,
            'failure_window'    => 60,   // segundos
            'cooldown'          => 30,
            'success_threshold' => 2,
            'request_timeout'   => 8,
        ],
        'stripe' => [
            'failure_threshold' => 3,
            'failure_window'    => 60,
            'cooldown'          => 60,
            'success_threshold' => 2,
            'request_timeout'   => 10,
        ],
        'mercadopago' => [
            'failure_threshold' => 5,
            'failure_window'    => 60,
            'cooldown'          => 45,
            'success_threshold' => 2,
            'request_timeout'   => 10,
        ],
        'twilio_voice' => [
            'failure_threshold' => 5,
            'failure_window'    => 120,
            'cooldown'          => 90,
            'success_threshold' => 2,
            'request_timeout'   => 15,
        ],
    ],
];
```

---

## 4. Estructura en Redis

Cada circuito utiliza **3 claves** con prefijo `cb:{integration}:{tenant_id?}`:

| Clave | Tipo | TTL | Propósito |
|-------|------|-----|-----------|
| `cb:{name}:state` | STRING | sin TTL (persistente) | `closed` / `open` / `half_open` |
| `cb:{name}:failures` | STRING (contador) | `failure_window` segundos | conteo de fallos en ventana |
| `cb:{name}:half_open_lock` | STRING | `request_timeout` segundos | lock para 1 sola request de prueba |
| `cb:{name}:opened_at` | STRING (timestamp) | sin TTL | momento en que pasó a OPEN, base para calcular cooldown |
| `cb:{name}:half_open_successes` | STRING (contador) | sin TTL | éxitos acumulados en HALF_OPEN |

> Para circuitos sensibles a tenant (ej. WhatsApp), `{name}` puede incluir `tenant_id` para que el fallo de un tenant no afecte a los demás.

---

## 5. Atomicidad: scripts Lua

**Toda transición de estado se ejecuta como un script Lua** atómico en Redis para evitar condiciones de carrera entre workers concurrentes. Tres scripts:

### 5.1 `acquire.lua` — antes de la llamada

Devuelve `ok|rejected_open|rejected_half_open` según el estado y, si procede, adquiere el lock de prueba. **No hace la llamada**, solo decide si se permite.

### 5.2 `record_success.lua` — después de éxito

Si está en CLOSED: limpia contador. Si está en HALF_OPEN: incrementa `half_open_successes`; si alcanza `success_threshold`, transiciona a CLOSED y limpia todo.

### 5.3 `record_failure.lua` — después de fallo

Incrementa `failures` con TTL de `failure_window`. Si llega a `failure_threshold` en CLOSED, transiciona a OPEN y guarda `opened_at`. Si está en HALF_OPEN, vuelve a OPEN inmediatamente.

> Las implementaciones Lua viven en `app/Infrastructure/CircuitBreaker/Lua/` y se cargan al arrancar.

---

## 6. API del Circuit Breaker (Backend)

### 6.1 Contrato

```php
namespace App\Infrastructure\CircuitBreaker;

interface CircuitBreaker
{
    /**
     * @template T
     * @param  callable():T  $operation
     * @throws CircuitOpenException si el circuito está abierto
     * @throws \Throwable lo que sea que lance la operación
     * @return T
     */
    public function call(string $integration, callable $operation, ?string $scope = null): mixed;

    public function state(string $integration, ?string $scope = null): CircuitState;
    public function forceOpen(string $integration, ?string $scope = null): void;   // panic button
    public function forceClose(string $integration, ?string $scope = null): void;  // recovery manual
}
```

### 6.2 Uso desde un dominio

```php
// app/Domain/Notifications/Whatsapp/SendWhatsappMessage.php
final class SendWhatsappMessage
{
    public function __construct(
        private CircuitBreaker $breaker,
        private MetaWhatsappClient $client,
        private FallbackQueue $fallback,
    ) {}

    public function execute(WhatsappMessage $msg): DeliveryResult
    {
        try {
            return $this->breaker->call(
                integration: 'whatsapp',
                scope: $msg->tenantId,
                operation: fn () => $this->client->send($msg),
            );
        } catch (CircuitOpenException) {
            // Circuito abierto: encolar para reintento posterior
            $this->fallback->enqueue($msg);
            return DeliveryResult::deferred();
        }
    }
}
```

### 6.3 Convención: política de fallback obligatoria

**Cada llamada protegida DEBE tener una estrategia clara para `CircuitOpenException`**:

| Integración | Fallback cuando OPEN |
|-------------|----------------------|
| WhatsApp | Encolar en `notifications:deferred`. Reintento por job al cerrar el circuito. |
| Twilio Voice | Saltar la llamada, solo dejar log. La cancelación automática procede igual. |
| Stripe | Devolver error 503 al cliente con mensaje "intenta en unos minutos". **Nunca** marcar pago como exitoso. |
| MercadoPago | Misma política que Stripe. |

---

## 7. Observabilidad

### 7.1 Métricas Prometheus

- `circuit_breaker_state{integration, scope}` — gauge (0=closed, 1=half_open, 2=open).
- `circuit_breaker_calls_total{integration, scope, outcome}` — counter (`success|failure|rejected`).
- `circuit_breaker_state_transitions_total{integration, from, to}` — counter.
- `circuit_breaker_open_duration_seconds{integration, scope}` — histogram.

### 7.2 Logs estructurados

Cada transición emite un log nivel `warning` (a OPEN) o `info` (recuperación) con: `integration`, `scope`, `from_state`, `to_state`, `failure_count`, `last_error`.

### 7.3 Alertas

- Pager si un circuito permanece OPEN > 5 minutos.
- Alerta de canal (no pager) si un circuito oscila (open → close → open) > 3 veces en 10 minutos.
- Dashboard Grafana dedicado: estado actual de los 4 circuitos, MTTR.

---

## 8. Panel de Administración Interno

Ruta protegida `/admin/circuits` (rol `platform_owner`):

- Estado en tiempo real de cada circuito (con scope por tenant si aplica).
- Botones: **Force Open** (mantenimiento), **Force Close** (recuperación), **Reset Counters**.
- Historial de últimas 50 transiciones.

---

## 9. Testing

### 9.1 Pruebas unitarias

- Mockear Redis con `predis-mock` o usar Redis efímero en Testcontainers.
- Casos obligatorios:
  - Transición CLOSED → OPEN al alcanzar threshold.
  - Rechazo inmediato en OPEN.
  - Transición OPEN → HALF_OPEN tras cooldown.
  - HALF_OPEN permite solo 1 request en vuelo.
  - HALF_OPEN → CLOSED tras `success_threshold`.
  - HALF_OPEN → OPEN al primer fallo.
  - Concurrencia: 100 workers paralelos no rompen contadores (verificar con script Lua atómico).

### 9.2 Pruebas de integración

- Simular fallo del proveedor con WireMock (timeout, 500, 429).
- Verificar que el circuito se abre y que el fallback se ejecuta.

---

## 10. Anti-patrones a EVITAR

- ❌ Hacer la llamada externa **dentro** del script Lua.
- ❌ Mantener el estado del circuito en memoria del proceso (se pierde el aislamiento entre workers).
- ❌ Usar el circuit breaker como reemplazo de retry. Son complementarios: retry para fallos transitorios cortos, circuit breaker para fallos sostenidos.
- ❌ Configurar `failure_threshold = 1` (cualquier glitch abre el circuito).
- ❌ Configurar `cooldown` muy corto (< 10s): no le das tiempo al proveedor a recuperarse.
- ❌ Olvidar el fallback: un `CircuitOpenException` no manejado se vuelve un 500 al usuario.

---

## 11. Checklist al Integrar un Nuevo Proveedor Externo

- [ ] Configuración del circuito añadida en `config/circuit-breaker.php`.
- [ ] Cliente del proveedor envuelto con `CircuitBreaker::call()`.
- [ ] Política de fallback definida y testeada.
- [ ] Métricas Prometheus expuestas.
- [ ] Alertas configuradas (5 min OPEN = pager).
- [ ] Tests unitarios + integración cubren los 6 casos del §9.1.
- [ ] Dashboard Grafana actualizado.
- [ ] Documentado en `claude.md` § Integraciones.
