#!/usr/bin/env bash
# =====================================================================
# Hope, Inc. ERP — restore a backup made with backup.sh (S3-DBA-06)
#
# WARNING: this REPLACES everything in the "public" schema with the backup.
# Anything added since the backup is lost. It asks before doing anything.
#
# Restore into the SAME Supabase project the backup came from: accounts
# (app_user) are linked to that project's Supabase Auth users.
#
# Usage:
#   export HOPE_DB_URL='postgresql://postgres.xxxx:PASSWORD@aws-0-xx.pooler.supabase.com:5432/postgres'
#   ./restore.sh backups/hope-20261106-1200.dump
# =====================================================================
set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: ./restore.sh backups/hope-YYYYMMDD-HHMM.dump" >&2
  exit 1
fi
if [ -z "${HOPE_DB_URL:-}" ]; then
  echo "Set HOPE_DB_URL first (Supabase → Connect → Session pooler connection string)." >&2
  exit 1
fi
command -v pg_restore >/dev/null || { echo "pg_restore not found. Install the PostgreSQL client tools first." >&2; exit 1; }
command -v psql >/dev/null || { echo "psql not found. Install the PostgreSQL client tools first." >&2; exit 1; }

echo "This will REPLACE all Hope, Inc. data with: $FILE"
read -r -p "Type RESTORE to continue: " ANSWER
[ "$ANSWER" = "RESTORE" ] || { echo "Cancelled. Nothing was changed."; exit 0; }

# The Supabase sign-up trigger (on auth.users) uses a function that the restore
# replaces, so it is removed first and always put back afterwards.
relink_signup_trigger() {
  psql "$HOPE_DB_URL" -q -v ON_ERROR_STOP=1 -c "
    SET client_min_messages = warning;
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();"
}
psql "$HOPE_DB_URL" -q -v ON_ERROR_STOP=1 -c "SET client_min_messages = warning; DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;"
trap relink_signup_trigger EXIT

# Data is loaded before triggers are re-created, so stamps and the audit
# log come back exactly as they were. All-or-nothing: on any error, nothing changes.
pg_restore \
  --dbname="$HOPE_DB_URL" \
  --clean --if-exists \
  --no-owner \
  --single-transaction \
  --exit-on-error \
  "$FILE"

echo "Restore finished. Reload the website to see the restored data."
