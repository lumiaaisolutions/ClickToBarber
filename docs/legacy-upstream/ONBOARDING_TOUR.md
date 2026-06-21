# Onboarding tutorial guiado

Tour interactivo que se dispara automáticamente para usuarios que ya
completaron el wizard de identidad (`first_login_at != null`) y nunca
descartaron el tour.

## Componentes

| Archivo | Rol |
|---|---|
| `frontend/src/components/admin/OnboardingTour.tsx` | Overlay + spotlight + 5 pasos |
| `frontend/src/app/admin/layout.tsx` | Monta `<OnboardingTour enabled={...} />` |
| `frontend/src/components/admin/AdminSidebar.tsx` | `data-tour="<key>"` en links + botón "Ver tour" |

## Pasos

| # | Target (`data-tour`) | Título | Mensaje |
|---|---|---|---|
| 1 | `dashboard` | Tu pulso diario | KPIs del día/mes |
| 2 | `agenda` | Calendario semanal | Drag-drop para reagendar |
| 3 | `identity` | Tu identidad visual | Paleta + tipografía + logo |
| 4 | `services` | Catálogo y precios | Lo que el cliente verá |
| 5 | `pos` | POS e inventario | Cobrar al terminar servicio |

## Persistencia de estado

`localStorage.lumia_tour_v1_done = "1"` cuando el usuario completa o
salta el tour. Para forzar reapertura:

```js
window.dispatchEvent(new Event("lumia:tour:open"));
```

El botón "Ver tour de bienvenida" en el sidebar dispara este evento.

## Cómo agregar / mover pasos

1. En `AdminSidebar.tsx`, agrega `data-tour: "<key>"` al item del NAV.
2. En `OnboardingTour.tsx`, agrega `{ target: "<key>", title, body }`
   al array `STEPS`.
3. **Bumpea** la key de versión: `STORAGE_KEY = "lumia_tour_v2_done"` 
   para que usuarios existentes vuelvan a ver el tour actualizado.

## Anti-fragilidad

Si un `data-tour` no existe en el DOM, `OnboardingTour` cae a tooltip
centrado en pantalla (sin spotlight). Sigue siendo usable.

## Estado

✅ Implementado y verificado en `/admin`.
🟡 Mejora opcional: log warning a consola si un step no encuentra target.
