#!/usr/bin/env bash
# LUMIA · backup Postgres con retención + S3 opcional + verificación.
#
# Diseñado para ejecutarse desde cron (cada noche 02:00):
#   0 2 * * * /opt/lumia/infra/backups/pg-backup.sh
#
# Variables esperadas:
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#   BACKUP_DIR=/var/lumia/backups
#   BACKUP_RETAIN_DAYS=30
#   S3_BUCKET=s3://lumia-backups (opcional; requiere awscli)
#   SLACK_WEBHOOK=...        (opcional, para alertas)
#
# Estrategia: pg_dump --format=custom (binario, restorable con pg_restore)
# diariamente. Para PITR real (Point-In-Time Recovery), Postgres ya debe
# tener WAL archiving activado; este script captura los snapshots base.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/lumia/backups}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${BACKUP_DIR}/lumia-${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

slack_alert() {
  if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
    curl -s -X POST -H 'Content-Type: application/json' \
      --data "{\"text\":\"$1\"}" "${SLACK_WEBHOOK}" > /dev/null || true
  fi
}

trap 'slack_alert ":x: LUMIA backup FAILED at ${TIMESTAMP}"' ERR

echo "[lumia-backup] dump → ${FILE}"
pg_dump --format=custom --no-owner --no-acl \
  --file="${FILE}" "${PGDATABASE}"

# Verificar que el dump no esté vacío y tenga estructura válida.
if [[ ! -s "${FILE}" ]]; then
  slack_alert ":warning: LUMIA backup vacío"
  exit 1
fi
pg_restore --list "${FILE}" > /dev/null

# Subir a S3 si está configurado.
if [[ -n "${S3_BUCKET:-}" ]]; then
  aws s3 cp "${FILE}" "${S3_BUCKET}/" --storage-class STANDARD_IA
fi

# Retención local
find "${BACKUP_DIR}" -name "lumia-*.dump" -mtime +${RETAIN_DAYS} -delete

slack_alert ":white_check_mark: LUMIA backup OK ${TIMESTAMP} ($(du -h "${FILE}" | cut -f1))"
echo "[lumia-backup] OK"
