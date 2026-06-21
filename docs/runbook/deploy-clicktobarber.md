# Runbook — Deploy ClickToBarber a Hostinger

> Procedimiento operativo para subir cambios a producción.

## Prerrequisitos (una sola vez)

1. SSH key Hostinger: `~/.ssh/hostinger_clicktoeat` (compartida con ClickToEat, mismo VPS).
2. DNS configurado en hPanel: ambos subdominios resuelven y tienen SSL.
3. MySQL DB creada: `u221820910_clicktobarber` con user dedicado.
4. `apps/api/.env` (no commiteado) llenado en el SERVIDOR con APP_KEY, DB_*, STRIPE_*, MAIL_*.

Si falta alguno, ver [`SETUP_PRODUCCION.md`](../SETUP_PRODUCCION.md).

## Primer deploy — gotchas encontrados (2026-06-20)

Estos problemas surgieron al desplegar por primera vez. Están resueltos en
el código — se documentan para que no sorprendan en el futuro.

### 1. `composer.lock` vs PHP del servidor

El servidor tiene **PHP 8.3.30**. Si el `composer.lock` se genera localmente
con PHP 8.4, Symfony 8.x entra al lock y falla en servidor (requiere PHP 8.4).

Fix permanente ya aplicado en `composer.json` (`config.platform.php = 8.3.30`):
```bash
cd apps/api
composer config platform.php 8.3.30
composer update
```

**Si ves este error en un futuro deploy:**
```
symfony/clock v8.0.x requires php >=8.4 → your php version (8.3.x)
```
Corre `composer update` en local y redeploy.

### 2. Índice MySQL demasiado largo (máx. 64 chars)

MySQL impone **máximo 64 caracteres** en nombres de índices. Los nombres
autogenerados de Laravel en tablas con nombres largos los superan.

Ya corregido en `2026_05_07_120001_create_calendar_tables.php`:
```php
$table->unique(['calendar_connection_id', 'appointment_id'], 'cal_ext_events_conn_appt_unique');
```

**Regla para futuras migraciones**: si usas `->unique()` o `->index()`
compuesto en una tabla de nombre largo, pasa el nombre explícito como
segundo argumento y verifica que sea ≤ 64 caracteres antes de mergear.

### 3. `storage:link` bloqueado por CageFS

`php artisan storage:link` usa `exec()` internamente. CageFS lo deshabilita.

**Solución** (ya aplicada en servidor, no hay que repetirla):
```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72 \
  "ln -sfn /home/u221820910/domains/clicktobarber-api.lumiaaisolutions.com/public_html/storage/app/public \
            /home/u221820910/domains/clicktobarber-api.lumiaaisolutions.com/public_html/public/storage"
```

El deploy excluye `public/storage` del rsync — el symlink persiste entre deploys.

### 4. Passenger para el frontend — no hay wizard en hPanel

hPanel no muestra una opción "Node.js" para subdominios VPS. Passenger se
configura directamente via `.htaccess` en `public_html/`. El patrón viene
del ClickToEat que ya funciona:

```apacheconf
PassengerAppRoot /home/u221820910/domains/clicktobarber.lumiaaisolutions.com/nodejs
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs20/root/bin/node
PassengerStartupFile server.js
PassengerBaseURI /
PassengerRestartDir /home/u221820910/domains/clicktobarber.lumiaaisolutions.com/nodejs/tmp
SetEnv NODE_OPTIONS "--max-old-space-size=256"
SetEnv UV_THREADPOOL_SIZE 4
SetEnv LSNODE_CONSOLE_LOG console.log
RewriteRule ^\.builds - [F,L]
```

Este archivo ya existe en `~/domains/clicktobarber.lumiaaisolutions.com/public_html/.htaccess`.
Si necesitas recrearlo (p. ej. en un servidor nuevo), también crea el directorio:
```bash
ssh ... "mkdir -p /home/u221820910/domains/clicktobarber.lumiaaisolutions.com/nodejs/tmp"
```

### 5. `cache:clear` antes de migrar (solo primera vez)

El script de deploy limpia caches antes de migrar. Si la tabla `cache` no
existe aún (instalación desde cero), falla. En deploys subsiguientes no ocurre.

Si tienes que instalar desde cero en un servidor nuevo, usa este orden:
```bash
php artisan key:generate --force
php artisan migrate --force
php artisan config:clear && php artisan route:clear && php artisan cache:clear
php artisan config:cache && php artisan route:cache
php artisan db:seed --force
```

---

## Deploy normal (cambios sin nuevas migraciones)

```bash
./scripts/deploy-api.sh
./scripts/deploy-web.sh
```

Los scripts hacen:
- API: rsync → composer install → caches clear → migrate → caches build → health check `/up`.
- Web: build local → tar → scp → extract en servidor → restart Passenger → health check.

Si el health check falla, los scripts hacen exit 1 y NO sobreescriben el build anterior (queda `.next.previous` en el server por si hay que rollback manual).

## Deploy con nuevas migraciones

Igual que normal — el script corre `php artisan migrate --force` automáticamente.

**Antes**, en local:
1. Corre la migración contra SQLite: `php artisan migrate` para verificar que no rompa.
2. Si la migración tiene SQL específico de MySQL, usa guard `if pgsql/sqlite return`.
3. Commit la migración + push antes del deploy (el script rsync sincroniza desde tu local).

## Deploy code-only (sin migrar)

```bash
./scripts/deploy-api.sh --skip-migrate
```

Usar cuando el deploy es un hotfix que no toca DB.

## Rollback de emergencia

### Frontend (más común — fallas de build/render)

```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72 \
    'cd /home/u221820910/domains/clicktobarber.lumiaaisolutions.com/nodejs && \
     rm -rf .next public && \
     mv .next.previous .next && mv public.previous public && \
     touch tmp/restart.txt'
```

### Backend (revertir código + redeploy)

```bash
git checkout HEAD~1                # vuelve al commit anterior
./scripts/deploy-api.sh --skip-tests
```

### Backend (revertir migración)

```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72 \
    'cd /home/u221820910/domains/clicktobarber-api.lumiaaisolutions.com/public_html && \
     php artisan migrate:rollback --step=1 --force'
```

⚠️ Solo si la migración tiene `down()` implementado. Si crea tablas con datos, mejor restaurar backup MySQL.

## Verificación post-deploy

```bash
# Backend health
curl https://clicktobarber-api.lumiaaisolutions.com/up
# → HTTP 200

# Frontend
curl -I https://clicktobarber.lumiaaisolutions.com
# → HTTP/2 200

# SEO básico
curl -sI https://clicktobarber.lumiaaisolutions.com/robots.txt | head -1   # → HTTP/2 200
curl -sI https://clicktobarber.lumiaaisolutions.com/sitemap.xml | head -1  # → HTTP/2 200

# OG tags del tenant demo
curl -s https://clicktobarber.lumiaaisolutions.com/b/el-navajazo | grep -oE 'og:(title|description|image)"[^>]+content="[^"]*"'
# → debe mostrar título, descripción e imagen del tenant
```

## Restart manual (sin redeploy)

```bash
# Backend (LSPHP) — sobreescribe .htaccess, riesgoso:
# ALTERNATIVA SEGURA:
ssh ... 'cd .../public_html && touch -a .htaccess'

# Frontend (Passenger):
ssh ... 'cd .../nodejs && touch tmp/restart.txt'
```

## Logs

```bash
# Laravel
ssh ... 'tail -100 /home/.../public_html/storage/logs/laravel.log'

# Cron
ssh ... 'tail -100 /home/.../public_html/storage/logs/cron.log'

# Queue
ssh ... 'tail -100 /home/.../public_html/storage/logs/queue.log'

# Passenger (Next.js)
ssh ... 'tail -100 /home/.../nodejs/stderr.log'
```

## Cron jobs (hPanel)

Configurar UNA SOLA VEZ desde hPanel → Trabajos Cron:

| Schedule | Command | Para qué |
|---|---|---|
| `* * * * *` | `cd /home/u221820910/domains/clicktobarber-api.lumiaaisolutions.com/public_html && php artisan schedule:run >> storage/logs/cron.log 2>&1` | Laravel scheduler (trials:expire-manual diario 10:30, etc.) |
| `* * * * *` | `cd /home/u221820910/domains/clicktobarber-api.lumiaaisolutions.com/public_html && php artisan queue:work --stop-when-empty --max-time=55 >> storage/logs/queue.log 2>&1` | Workers (reemplaza Horizon) |
