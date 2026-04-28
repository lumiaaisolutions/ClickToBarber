# LUMIA — Presets de identidad

Cuatro paletas curadas que sirven como semilla para cada barbería en el
wizard de onboarding. El admin puede luego ajustar tokens individuales
desde `/admin/identity`.

## 1. Old Money Verde — `old-money-emerald`

```
primary:   #1F3D2B   (verde botella)
primary-2: #2D5240
primary-3: #14281C
accent:    #B8935E   (oro mate envejecido)
accent-2:  #C9A878
mode:      light
display:   Cormorant Garamond
body:      Inter Tight
```

**Para:** clubs privados, barberías clásicas, atelier urbano serio.

**Sensación:** marfil, cuero verde antiguo, latón pulido. Old money inglés.

---

## 2. Marfil & Latón — `ivory-brass`

```
primary:   #4A3320   (marrón espresso)
primary-2: #5C4128
primary-3: #2E1F12
accent:    #A37438   (latón pulido)
accent-2:  #B8854A
mode:      sepia
display:   Cormorant Garamond
body:      Inter Tight
```

**Para:** shops de autor con luz natural, barberías de barrios premium.

**Sensación:** crema cálida, vintage publishing, papel manila envejecido.

---

## 3. Navy Clásico — `navy-classic`

```
primary:   #1A2F4F   (navy medianoche)
primary-2: #2A4470
primary-3: #0E1A2D
accent:    #8C9DB5   (plata vieja)
accent-2:  #A6B4C8
mode:      light
display:   Cormorant Garamond
body:      Inter Tight
```

**Para:** barberías costeras, shops con estética náutica preppy.

**Sensación:** azul medianoche, hueso, plata vieja, club de yates.

---

## 4. Carbón Premium — `carbon-premium`

```
primary:   #2D5240   (verde profundo, contrastado)
primary-2: #3F6F58
primary-3: #1E3A2D
accent:    #C9A961   (oro tradicional)
accent-2:  #E0BE74
mode:      dark
display:   Cormorant Garamond
body:      Inter Tight
```

**Para:** barberías nocturnas, atelier urbano contemporáneo.

**Sensación:** carbón profundo, luz baja, latón cálido. La identidad LUMIA
original (versión migrada al sistema de presets).

---

## Cómo añadir un preset nuevo

1. Edita `frontend/src/components/admin/OnboardingWizard.tsx` en la constante
   `PRESETS` y `frontend/src/components/admin/BrandingEditor.tsx`.
2. Edita `frontend/src/components/landing/LandingPresets.tsx` para que aparezca
   en la landing pública.
3. Si el modo es `sepia` o `dark`, asegúrate de que `globals.css` tenga el
   bloque `[data-mode="..."]` con los overrides necesarios.
4. Documenta el nuevo preset aquí con su sensación, paleta y caso de uso.

## Tokens estructurales (no son presets)

- `radius`: `sharp` (4px) · `soft` (14px) · `round` (24px)
- `density`: `compact` (0.85) · `comfortable` (1) · `airy` (1.18)
- `mode`: `light` · `sepia` · `dark`

Estos son ortogonales al preset y se aplican como CSS variables
`--tenant-radius` / `--tenant-density` / atributo `data-tenant-mode`.
