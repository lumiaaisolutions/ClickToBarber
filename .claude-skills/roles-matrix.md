# Matriz de roles — LUMIA

> Quién puede hacer qué en `/admin/*`. Este documento es la fuente de verdad
> para `EnsureRole`, `User::canWrite()` y la UI condicional.

## Roles disponibles

| code | Etiqueta UI | Descripción |
|------|-------------|-------------|
| `platform_owner` | Owner LUMIA | Staff de LUMIA, super-admin. Bypass de `EnsureRole`. |
| `admin` | Administrador | Dueño/a de la barbería. Permisos completos. |
| `manager` | Gerente | Permisos completos excepto suscripción/billing. |
| `receptionist` | Recepcionista | Lectura + manejo de agenda. Sin staff/finanzas/identidad. |
| `barber` | Barbero | Sólo ve su perfil y edita sus horarios. |
| `client` | Cliente | No accede al portal admin. |

## Matriz de permisos

|                          | Owner | Admin | Manager | Recepción | Barbero |
|--------------------------|:-----:|:-----:|:-------:|:---------:|:-------:|
| Login al portal admin    |   ✅   |   ✅   |    ✅    |     ✅     |    ✅    |
| **Lectura general**      |       |       |         |           |         |
| Dashboard                |   ✅   |   ✅   |    ✅    |     ✅     |    👤    |
| Agenda completa          |   ✅   |   ✅   |    ✅    |     ✅     |    👤    |
| Lista de barberos        |   ✅   |   ✅   |    ✅    |     ✅     |    👤    |
| Lista de servicios       |   ✅   |   ✅   |    ✅    |     ✅     |    ✅    |
| **Escritura (CRUD)**     |       |       |         |           |         |
| CRUD barberos            |   ✅   |   ✅   |    ✅    |     ❌     |    ❌    |
| CRUD servicios           |   ✅   |   ✅   |    ✅    |     ❌     |    ❌    |
| CRUD productos (POS)     |   ✅   |   ✅   |    ✅    |     ❌     |    ❌    |
| **Mis horarios**         |       |       |         |           |         |
| Editar mis horarios      |   —   |   ✅   |    ✅    |     —     |    ✅    |
| **Identidad visual**     |       |       |         |           |         |
| Ver branding             |   ✅   |   ✅   |    ✅    |     ✅     |    ✅    |
| Editar branding          |   ✅   |   ✅   |    ✅    |     ❌     |    ❌    |
| **Finanzas**             |       |       |         |           |         |
| Ver finanzas             |   ✅   |   ✅   |    ✅    |     ❌     |    ❌    |
| Cierre de caja           |   ✅   |   ✅   |    ✅    |     ❌     |    ❌    |
| **Marketing**            |       |       |         |           |         |
| Campañas / cupones       |   ✅   |   ✅   |    ✅    |     ✅     |    ❌    |
| **Suscripción**          |       |       |         |           |         |
| Ver plan                 |   ✅   |   ✅   |    ✅    |     ❌     |    ❌    |
| Cambiar plan             |   ✅   |   ✅   |    ❌    |     ❌     |    ❌    |

Leyenda: ✅ permitido · ❌ bloqueado · 👤 vista personalizada (solo lo suyo)

## Cómo se aplica

### Backend
- Middleware `role:admin,manager` en `routes/api.php`. Usa `EnsureRole`.
- `User::canWrite()` y `User::canSeeFinance()` para checks programáticos en
  controllers.
- `platform_owner` siempre bypassa; nunca lo agregues a la lista permitida
  porque ya pasa por defecto.

### Frontend
- El layout admin pide `/auth/me` y obtiene `can_write`, `can_see_finance` y
  `role`. Pásalos como props a los Client Components que los usen.
- Los Client Components (`StaffClient`, `ServicesClient`, etc.) **ocultan
  visualmente** los botones Crear/Editar/Eliminar si `canWrite === false`.
  Esto NO es seguridad — sólo UX. La seguridad la hace el middleware.
- Para vistas "mis cosas" (barbero) usar el flag `role === 'barber'` y filtrar
  por `email === user.email`.

## Login matrix

Sólo roles en `User::PORTAL_ROLES` pueden hacer login en `/api/auth/login`.
`client` queda excluido (los clientes finales reservan vía `/b/{slug}` sin
sesión).

## Demo accounts

```
admin@elnavajazo.test      / password   → admin (CRUD completo)
gerencia@elnavajazo.test   / password   → manager (CRUD sin billing)
recepcion@elnavajazo.test  / password   → receptionist (lectura + agenda)
diego@elnavajazo.test      / password   → barber (sólo "mis horarios")
admin@marfil.test          / password   → admin SIN onboarding (wizard demo)
```
