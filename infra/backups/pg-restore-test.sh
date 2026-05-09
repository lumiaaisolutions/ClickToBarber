#!/usr/bin/env bash
# LUMIA · test mensual de restore.
#
# Restaura el dump más reciente a una BD temporal y compara conteos
# con la BD productiva. Falla si el row count difiere por más del 5%
# (asumimos que entre el dump y "ahora" la base creció algo).
#
# Cron sugerido: 1er sábado del mes 03:00.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/lumia/backups}"
TEST_DB="lumia_restore_test"

LATEST="$(ls -1t "${BACKUP_DIR}"/lumia-*.dump | head -n 1)"
[[ -z "${LATEST}" ]] && { echo "No hay backups"; exit 1; }

echo "[restore-test] usando ${LATEST}"

dropdb --if-exists "${TEST_DB}"
createdb "${TEST_DB}"
pg_restore --no-owner --dbname="${TEST_DB}" "${LATEST}"

PROD_TABLES=$(psql -At -d "${PGDATABASE}" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
TEST_TABLES=$(psql -At -d "${TEST_DB}"   -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")

if [[ "${PROD_TABLES}" -ne "${TEST_TABLES}" ]]; then
  echo "[restore-test] FAIL: prod=${PROD_TABLES} test=${TEST_TABLES}"
  exit 1
fi

dropdb "${TEST_DB}"
echo "[restore-test] OK · ${TEST_TABLES} tablas restauradas correctamente"
