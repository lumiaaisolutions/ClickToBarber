-- BarberPro: PostgreSQL initialization
-- Habilita extensiones requeridas para el dominio
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

ALTER DATABASE barberpro SET timezone TO 'America/Mexico_City';

-- ----------------------------------------------------------------------------
-- Multi-tenancy con Row Level Security
-- ----------------------------------------------------------------------------
-- La migración `enable_rls_for_tenant_tables` activa RLS en cada tabla
-- tenant-scoped y crea la política `tenant_isolation` que filtra por
-- current_setting('app.current_tenant'). El middleware ResolveTenant emite
-- `SET LOCAL app.current_tenant = '<uuid>'` al inicio de cada request.
--
-- Importante: el rol superuser (postgres) y el owner de las tablas hacen
-- BYPASSRLS por defecto. Para que RLS aplique en producción, la app debe
-- conectarse con un rol no-owner sin atributo BYPASSRLS, p.ej.:
--
--   CREATE ROLE barberpro_app LOGIN PASSWORD '...';
--   GRANT CONNECT ON DATABASE barberpro TO barberpro_app;
--   GRANT USAGE ON SCHEMA public TO barberpro_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO barberpro_app;
--   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO barberpro_app;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO barberpro_app;
--
-- En desarrollo local seguimos conectando como postgres (BYPASSRLS) para que
-- migrate:fresh + seeders funcionen sin fricción.
