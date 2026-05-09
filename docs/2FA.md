# 2FA — Autenticación en dos pasos (TOTP)

> Implementado con **RFC 6238 puro PHP** — sin dependencias externas.
> Código: `app/Domain/Identity/Services/TotpService.php`,
> `app/Http/Admin/Controllers/TwoFactorController.php`.

## Para qué sirve

Suma una capa de protección al login del portal admin. Ante un email +
contraseña comprometidos, el atacante todavía necesita el código de 6
dígitos rotando cada 30 s en el dispositivo del dueño.

## Flujo de activación (admin user)

1. Admin entra a `/admin/security/2fa` y pulsa **Activar**.
2. Backend (`POST /api/admin/security/2fa/setup`) genera:
   - **Secret** de 20 bytes en base32 (160 bits).
   - **8 códigos de recuperación** formato `xxxx-xxxx`.
   - **URI** `otpauth://...` para escanear como QR.
   El secret y los recovery codes se cifran con `Crypt::encryptString`
   antes de persistirse en `users.two_factor_*`.
3. Admin escanea el QR con 1Password / Authy / Google Authenticator (o
   ingresa el secret manualmente).
4. Admin ingresa el primer código de 6 dígitos. `POST .../confirm` valida
   con tolerancia ±1 paso (30 s) contra drift de reloj. Si OK, se setea
   `two_factor_confirmed_at = now()`.
5. Audit log registra la acción `2fa.enabled`.

## Flujo de login con 2FA

1. `POST /api/auth/login` con email/password.
2. Si el user tiene `two_factor_confirmed_at`:
   - Backend devuelve `{ requires_2fa: true, login_token, email }`.
   - El `login_token` (`Str::random(48)`) se cachea con TTL 5 min en
     Redis/cache → mapea al user id.
   - El navegador **NO recibe** Sanctum token todavía.
3. Frontend (`LoginForm.tsx`) cambia al step `twofa` y pide el código.
4. `POST /api/auth/2fa/verify` con `{login_token, code}`:
   - Acepta TOTP de 6 dígitos.
   - Acepta recovery code formato `xxxx-xxxx` — **lo consume** (lo borra
     de la lista persistida).
5. Si válido, emite Sanctum token y persiste cookie `bp_token`.

## Recovery codes

- 8 códigos de 4+4 hex generados en setup.
- Cifrados (JSON serializado) en `users.two_factor_recovery_codes`.
- Cada uno se usa **una sola vez**. Cuando se queden < 3, la UI sugiere
  regenerar.
- `POST /api/admin/security/2fa/regenerate-codes` invalida todos y emite 8 nuevos.

## Desactivar

`POST /api/admin/security/2fa/disable` con `{password}`. Verifica password
actual antes de borrar secret y recovery. Audit `2fa.disabled`.

## Riesgos cubiertos

| Vector | Mitigación |
|--------|-----------|
| Phishing del password | 2FA bloquea el segundo paso |
| Replay del código | Tolerancia ±1 paso (60 s ventana real); el cliente sólo lo escribe una vez |
| Drift de reloj del cliente | Tolerancia ±1 paso |
| Pérdida del dispositivo | 8 recovery codes |
| Pérdida total | Disable forzoso vía soporte (rotando APP_KEY si fuera necesario) |

## Riesgos abiertos / TODO

- No hay enforcement por política — cada admin elige activar. Para tenants
  Enterprise sería razonable forzar 2FA con un flag `tenant.require_2fa`.
- No hay límite por número de recovery codes consumidos en ventana de
  tiempo (rate-limited a nivel `throttle:login` por IP).

## Tests

`backend/tests/Feature/Auth/TwoFactorTest.php` (TODO — pendiente). Mínimo:
- Setup → confirm con código válido → activa.
- Login con 2FA exige verify; con código incorrecto rechaza.
- Recovery code se consume tras uso.
