# Custom domains por tenant

> White-label completo: `reservas.elnavajazo.com` → app de LUMIA sirve
> el portal de ese tenant. Tabla `tenant_domains`. Middleware
> `ResolveTenantByHost`.

## Por qué

El tier 4 de diferenciación: las barberías premium quieren su URL
propia, no un slug `/b/el-navajazo`. Stripe / Calendly / Mindbody ofrecen
custom domains; cobramos $10/mo extra o se incluye en plan Enterprise.

## Schema

```
tenant_domains
├─ id
├─ tenant_id (uuid)
├─ host (unique global, ej. "reservas.barberia.com")
├─ verification_token (lumia-<random hex>)
├─ verified_at
├─ is_primary (uno por tenant)
└─ created_at
```

## Flujo de verificación

1. Admin agrega un host en `/admin/domains` → `POST /api/admin/domains`.
2. Backend genera `verification_token` y devuelve instrucciones DNS:
   ```
   TXT  _lumia-verify.reservas.barberia.com  lumia-<token>
   CNAME reservas.barberia.com               cname.lumia.app
   ```
3. Admin configura ambos en su proveedor DNS.
4. Pulsa **Verificar TXT** → `POST /api/admin/domains/{id}/verify`.
5. Backend hace `dns_get_record('_lumia-verify.<host>', DNS_TXT)` y busca
   el token. Si lo encuentra, setea `verified_at = now()`.
6. Admin marca como **primario** opcionalmente.

## Resolución de tenant por host

Cuando llega una request al host custom, `ResolveTenantByHost` mappea:

```
Cache::remember('host_to_tenant:'.$host, 60s, function () {
    return TenantDomain::where('host', $host)
        ->whereNotNull('verified_at')
        ->value('tenant_id');
});
```

El cache 60 s evita martillar la DB. Cuando se borra/agrega/verifica un
domain, el controller llama `Cache::forget('host_to_tenant:'.$host)`.

`ResolveTenantByHost` corre **después** de `ResolveTenant`, sólo si éste
último no resolvió por bearer / slug / X-Tenant.

## Infra prod

LUMIA opera en `lumia.app`. Para servir `reservas.barberia.com`:

- DNS del cliente: `CNAME reservas.barberia.com cname.lumia.app`.
- LUMIA en `cname.lumia.app` apunta a un load balancer con TLS terminado
  por Cloudflare for SaaS o Fly.io custom domains.
- TLS automático via ACME (Let's Encrypt). Cloudflare for SaaS lo hace
  out-of-the-box; Fly.io lo soporta con `fly certs add`.
- El header `Host` llega intacto al backend → middleware lo lee.

## Riesgos

- **Squatting**: dos tenants no pueden tener el mismo host (UNIQUE en
  `host`). Pero un atacante podría agregar `reservas.lumia.app` antes
  que el cliente legítimo. Mitigación: blacklist de subdominios reservados
  (TODO: validation regex).
- **DNS rebinding / spoofing**: para mitigar, el CNAME es a un host LUMIA
  que cae en una IP autenticada con TLS válido. La verificación TXT
  garantiza que el dueño del DNS aprobó la asociación.
- **Hosts retirados**: si el cliente borra el DNS, las requests caen en
  503 (Cloudflare). El admin verá el dominio como "verificado" en LUMIA
  hasta que rehagamos el chequeo (TODO: cron diario que re-verifique
  TXT y marque `verified_at = null` si no lo encuentra).

## Pendientes

- Cron diario re-verifica TXT.
- Validación regex de hosts (sin caracteres raros, sin sub-bloqueados).
- UI con instrucciones específicas por proveedor (Cloudflare, GoDaddy).
- Status DNS (con propagación) en la UI mientras el admin espera.
