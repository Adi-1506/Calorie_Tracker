#!/usr/bin/env bash
# Applies all migrations to a throwaway Postgres database and runs the RLS tests.
# Needs psql and a Postgres server; set DATABASE_URL to point at it
# (default: postgres://postgres:postgres@localhost:5432/postgres).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMIN_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
TEST_DB="calorie_tracker_test_$$"
TEST_URL="${ADMIN_URL%/*}/${TEST_DB}"

psql "$ADMIN_URL" -qX -v ON_ERROR_STOP=1 -c "create database ${TEST_DB}"
trap 'psql "$ADMIN_URL" -qX -c "drop database if exists ${TEST_DB} with (force)" >/dev/null' EXIT

run() { psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 -o /dev/null -f "$1"; }

run "$ROOT/supabase/tests/local_supabase_stubs.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "Applying $(basename "$f")"
  run "$f"
done
run "$ROOT/supabase/tests/rls.test.sql"
