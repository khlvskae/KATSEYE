#!/usr/bin/env bash
# =====================================================================
# Hope, Inc. ERP — back up the Supabase database (S3-DBA-06)
#
# Saves everything in the "public" schema: tables, data, views, functions,
# triggers, indexes, row-level security rules and the audit log.
# Accounts' passwords live in Supabase Auth and are not part of this backup.
#
# Needs the PostgreSQL client tools (pg_dump), version 17 or newer:
#   Mac:      brew install postgresql@17
#   Windows:  install PostgreSQL from postgresql.org (tick "Command Line Tools")
#
# Usage:
#   export HOPE_DB_URL='postgresql://postgres.xxxx:PASSWORD@aws-0-xx.pooler.supabase.com:5432/postgres'
#   ./backup.sh
# The connection string is in Supabase → Connect → "Session pooler".
# =====================================================================
set -euo pipefail

if [ -z "${HOPE_DB_URL:-}" ]; then
  echo "Set HOPE_DB_URL first (Supabase → Connect → Session pooler connection string)." >&2
  exit 1
fi
command -v pg_dump >/dev/null || { echo "pg_dump not found. Install the PostgreSQL client tools first." >&2; exit 1; }

mkdir -p backups
FILE="backups/hope-$(date +%Y%m%d-%H%M).dump"

pg_dump "$HOPE_DB_URL" \
  --schema=public \
  --no-owner \
  --format=custom \
  --file="$FILE"

echo "Backup saved: $FILE ($(du -h "$FILE" | cut -f1))"
echo "Keep it somewhere safe. It contains all business data. Do not commit it to GitHub."
