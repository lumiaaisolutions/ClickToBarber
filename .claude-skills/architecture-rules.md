# Skill: Architecture Rules — DDD + Screaming Architecture (BarberPro)

> Skill cargable por Claude Code. Define las reglas no-negociables de organización, dependencias y diseño que rigen TODO el código backend de BarberPro. Si una propuesta viola este documento, debe rechazarse o reformularse.

---

## 1. Filosofía

### 1.1 Screaming Architecture (Robert C. Martin)

> "La arquitectura debería gritar el dominio del negocio, no el framework."

Al abrir `app/`, un nuevo desarrollador debe entender en 5 segundos que esto es **una plataforma de barberías**, no "una app Laravel genérica". Por eso:

- ❌ **Prohibido**: `app/Models/`, `app/Services/`, `app/Repositories/` como carpetas raíz que agrupan por tipo técnico.
- ✅ **Obligatorio**: `app/Domain/Appointments/`, `app/Domain/Staff/`, etc. Agrupación por **bounded context** (dominio de negocio).

### 1.2 Domain-Driven Design (Eric Evans)

Cada dominio es autónomo, tiene su propio lenguaje ubicuo, sus entidades, sus reglas de negocio, y se comunica con otros dominios **solo mediante eventos o contratos explícitos**.

---

## 2. Bounded Contexts del Proyecto

| Bounded Context | Responsabilidad | Lenguaje ubicuo |
|-----------------|-----------------|-----------------|
| **Tenancy** | Aislamiento multi-tenant, resolución de tenant actual | Tenant, Subdomain, Plan |
| **Identity** | Autenticación, usuarios, roles, sesiones | User, Role, Token, Credential |
| **Subscriptions** | Planes, features habilitados, gates | Plan, Feature, Gate, Quota |
| **Billing** | Cobro de la suscripción de la barbería a la plataforma | Invoice, Subscription, Charge |
| **Staff** | Barberos, horarios, comisiones | Barber, Shift, Commission |
| **Catalog** | Servicios y productos vendibles | Service, Product, Category |
| **Scheduling** | Disponibilidad, slots, calendario | Slot, Availability, BusinessHours |
| **Appointments** | Cita como agregado raíz, ciclo de vida, no-show | Appointment, Reservation, Confirmation, NoShow |
| **Payments** | Cobros del cliente final (depósitos, servicios) | Deposit, Payment, Refund |
| **PointOfSale** | Tickets de venta, propinas, cierre de turno | Ticket, LineItem, Tip |
| **Inventory** | Stock, movimientos, alertas | StockItem, Movement, Threshold |
| **Notifications** | Envío multicanal (WhatsApp, Email, Voz) | Channel, Template, Delivery |
| **Marketing** | Retención, campañas, cupones | Segment, Campaign, Coupon |
| **Finance** | Cierre de caja, comisiones liquidadas, reportes | CashClose, Settlement, Report |

---

## 3. Estructura Interna de un Dominio

Cada carpeta `app/Domain/{Context}/` sigue **rigurosamente** este esqueleto:

```
app/Domain/Appointments/
├── Models/                       ← Entidades Eloquent (agregados raíz primero)
│   ├── Appointment.php
│   └── AppointmentStatusHistory.php
├── ValueObjects/                 ← Inmutables, autovalidados
│   ├── AppointmentStatus.php     ← enum
│   ├── TimeSlot.php
│   └── DepositAmount.php
├── Repositories/
│   ├── Contracts/
│   │   └── AppointmentRepository.php   ← interfaz
│   └── EloquentAppointmentRepository.php
├── Services/                     ← Lógica de aplicación / casos de uso
│   ├── BookAppointment.php
│   ├── ConfirmAppointment.php
│   ├── CancelForNoShow.php
│   └── RescheduleAppointment.php
├── Events/                       ← Eventos de dominio
│   ├── AppointmentBooked.php
│   ├── AppointmentConfirmed.php
│   └── AppointmentCancelledForNoShow.php
├── Listeners/                    ← Reaccionan a eventos PROPIOS o de OTROS dominios
│   └── ScheduleConfirmationReminders.php
├── Jobs/                         ← Trabajos asíncronos
│   └── AutoCancelUnconfirmedAppointment.php
├── Policies/                     ← Autorización (Gate de Laravel)
│   └── AppointmentPolicy.php
├── Exceptions/                   ← Excepciones específicas del dominio
│   ├── SlotAlreadyBooked.php
│   └── CannotCancelConfirmed.php
├── Database/
│   ├── Migrations/
│   ├── Factories/
│   └── Seeders/
└── Tests/
    ├── Unit/
    └── Feature/
```

### 3.1 Reglas sobre los componentes

- **Models**: Eloquent. Pueden tener métodos de comportamiento (no son anémicos), pero la lógica compleja vive en Services.
- **ValueObjects**: PHP `readonly class`. Validación en el constructor. Inmutables. Comparación por valor.
- **Repositories**: SIEMPRE un contrato (interfaz) en `Contracts/` + una implementación. El binding se registra en un `ServiceProvider` por dominio.
- **Services**: Una clase por caso de uso (verbo + sustantivo). Método público único `execute(...)` o `__invoke(...)`. Devuelve un DTO o el agregado.
- **Events**: Solo datos serializables + tenant_id + timestamp. Inmutables.
- **Jobs**: `ShouldQueue`. Idempotentes. Con `uniqueId()` cuando aplique. `tries`, `backoff` y `failed()` definidos.
- **Exceptions**: Heredan de una `DomainException` raíz por contexto, que extiende `\DomainException`.

---

## 4. Reglas de Dependencia entre Dominios

### 4.1 Regla de la Dependencia Acíclica

Los dominios forman un **DAG** (grafo dirigido acíclico). Las dependencias permitidas se declaran en `architecture.php` y se validan en CI con [Deptrac](https://github.com/qossmic/deptrac).

```
Tenancy ← Identity ← Subscriptions ← Billing
                                    ↘
Catalog ← Staff ← Scheduling ← Appointments ← Payments
                                    ↓
                                Notifications ← Marketing
                                    ↓
                                  Finance
```

### 4.2 Comunicación Entre Dominios

Tres caminos permitidos, en orden de preferencia:

1. **Eventos de dominio** (preferido): `Appointments` emite `AppointmentBooked` → `Notifications` escucha y envía WhatsApp. Acoplamiento mínimo.
2. **Contratos (interfaces) inyectados**: `Appointments` necesita verificar feature → depende de `Subscriptions\Contracts\FeatureGate`.
3. **Read Models / Query Services**: para lecturas cruzadas (ej. dashboard del Admin), un servicio de query agrega datos de varios dominios sin acoplar la escritura.

❌ **Prohibido**: que `Appointments\Services\BookAppointment` haga `new Notifications\Whatsapp\WhatsappClient()`.

---

## 5. Capa Infrastructure

Adaptadores técnicos que **no son dominio**:

```
app/Infrastructure/
├── CircuitBreaker/         ← Implementación Redis (ver circuit-breaker.md)
├── RateLimit/              ← Middleware + store Redis
├── Persistence/
│   ├── Tenancy/            ← Resolver de tenant + scope global
│   └── Migrations/         ← Helpers (ej. `tenantTable()`)
├── Integrations/
│   ├── Stripe/
│   ├── MercadoPago/
│   ├── MetaWhatsapp/
│   └── TwilioVoice/
├── Queue/                  ← Configuración Horizon, supervisores
└── Logging/                ← Channels personalizados, processors
```

Las integraciones externas (`MetaWhatsapp`, `Stripe`, etc.) **siempre** se exponen al dominio mediante un puerto (interfaz en `Domain/{X}/Contracts/`) implementado aquí. El dominio nunca importa el SDK directamente.

---

## 6. Capa HTTP

```
app/Http/
├── Admin/
│   ├── Controllers/
│   │   └── Appointments/
│   │       ├── ListAppointmentsController.php   ← un controlador = un endpoint
│   │       └── BookAppointmentController.php
│   ├── Requests/                ← FormRequest con validación
│   ├── Resources/               ← API Resources (transformación de salida)
│   └── Middleware/
└── Client/
    └── (misma estructura)
```

### 6.1 Reglas para Controladores

- **Single Action Controllers** (un método `__invoke`).
- Reciben `FormRequest` validado + dependencias inyectadas (Service del dominio).
- **Cero lógica de negocio**: solo orquestación HTTP → Service → Resource.
- Nunca acceden a Eloquent directamente. Siempre vía Repository o Service.

```php
final class BookAppointmentController
{
    public function __construct(private BookAppointment $bookAppointment) {}

    public function __invoke(BookAppointmentRequest $request): AppointmentResource
    {
        $appointment = $this->bookAppointment->execute($request->toDto());
        return new AppointmentResource($appointment);
    }
}
```

---

## 7. Multi-Tenancy en Código

### 7.1 Resolución del Tenant

- Middleware `ResolveTenant` (orden 1) lee el tenant del JWT/Sanctum, lo coloca en el container (`app()->instance(CurrentTenant::class, $tenant)`) y emite `SET LOCAL app.current_tenant = '{uuid}'` en PostgreSQL.

### 7.2 Scope Global

- Trait `BelongsToTenant` para todos los modelos tenant-scoped:
  - Aplica un `GlobalScope` que filtra por `tenant_id`.
  - Asigna automáticamente `tenant_id` en `creating`.
- RLS de PostgreSQL como segunda barrera (defensa en profundidad).

### 7.3 Migraciones

- Helper `Schema::tenantTable('appointments', function ($table) { ... })` que:
  - Añade `tenant_id UUID NOT NULL` indexado.
  - Crea automáticamente la política RLS.
  - Falla la migración si se omite.

---

## 8. Convenciones de Código

| Tema | Regla |
|------|-------|
| **Strict types** | `declare(strict_types=1);` en todos los archivos PHP |
| **Final classes** | Por defecto `final class`. Solo abrir herencia con justificación |
| **Readonly** | ValueObjects y DTOs siempre `readonly` |
| **Naming Services** | Verbo en infinitivo: `BookAppointment`, `CancelForNoShow` |
| **Naming Events** | Pasado: `AppointmentBooked`, `DepositCaptured` |
| **Naming Jobs** | Imperativo: `SendConfirmationWhatsapp` |
| **Naming Repos** | `{Aggregate}Repository` (interfaz) + `Eloquent{Aggregate}Repository` |
| **Tests** | Pest. Estructura `describe()`/`it()`. Mínimo 1 test por Service |
| **Linter** | Laravel Pint con preset PSR-12 + reglas custom en `pint.json` |
| **Static analysis** | PHPStan nivel 8, Larastan, Deptrac en CI |

---

## 9. Prevención de Errores Recurrentes

### 9.1 N+1

- `Model::preventLazyLoading()` activado en `AppServiceProvider::boot()` cuando `! app()->isProduction()`.
- En producción, cada lazy load registra un warning en Sentry sin romper.

### 9.2 SQL Injection

- Prohibido `DB::raw("... $variable ...")`. Usar bindings: `DB::raw('column = ?', [$variable])` o Query Builder.
- Revisión obligatoria en code review de cualquier `whereRaw`, `selectRaw`, `orderByRaw`.

### 9.3 Sanitización

- Validación de entrada **siempre** en `FormRequest`. Reglas estrictas (no `string` solo, sino `string|max:N|regex:/.../`).
- Output: confiar en escape de Blade/React. Para HTML de usuario (raro), DOMPurify en cliente + HTMLPurifier en server.

### 9.4 Mass Assignment

- Modelos con `$fillable` explícito (jamás `$guarded = []`).

---

## 10. Testing — Pirámide

| Tipo | Cobertura objetivo | Herramienta |
|------|--------------------|-------------|
| Unit (ValueObjects, Services puros) | > 90% | Pest |
| Feature (HTTP + DB) | rutas críticas 100% | Pest + RefreshDatabase |
| Integration (Redis, integraciones externas con WireMock) | flujos críticos | Pest + Testcontainers |
| E2E | smoke principal | Playwright (frontend-driven) |

Cada nuevo Service requiere su test unitario. Cada nuevo endpoint, su feature test.

---

## 11. Checklist Antes de Mergear

- [ ] Carpetas creadas en el dominio correcto (no en raíces genéricas).
- [ ] Repositories con interfaz + binding registrado.
- [ ] Eventos emitidos en lugar de llamadas cruzadas a otros dominios.
- [ ] Migración usa `tenantTable()` si la tabla es tenant-scoped.
- [ ] FormRequest valida toda entrada HTTP.
- [ ] Test unitario del Service nuevo + feature test del endpoint.
- [ ] Sin `DB::raw` con interpolación.
- [ ] Sin lazy loading.
- [ ] PHPStan nivel 8 verde, Pint aplicado, Deptrac sin violaciones.
- [ ] Si tocó UI: feature gate frontend + middleware backend `EnsureFeatureEnabled`.
