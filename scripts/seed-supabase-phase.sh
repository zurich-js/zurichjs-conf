#!/usr/bin/env bash
set -euo pipefail

phase="${1:-}"
project_id="${SUPABASE_PROJECT_ID:-svkbzhlrjujeteqjrckv}"
db_container="${SUPABASE_DB_CONTAINER:-supabase_db_${project_id}}"

usage() {
  cat <<'USAGE'
Usage: scripts/seed-supabase-phase.sh <phase>

Phases:
  cfp-first-stage  Reviewer workload: submissions, reviewers, reviews, no decisions/schedule.
  cfp-admission    Admission workload: accepted/rejected/pending submissions, no schedule.
  cfp-schedule     Scheduling workload: schedule slots, a few linked submissions, no commerce.
  cfp-travel-ready Scheduling plus confirmed travel/transport and reimbursements.
  workshop-commerce Full local seed including workshop commerce and registrations.

Environment overrides:
  SUPABASE_PROJECT_ID    Defaults to svkbzhlrjujeteqjrckv.
  SUPABASE_DB_CONTAINER  Defaults to supabase_db_${SUPABASE_PROJECT_ID}.
USAGE
}

case "$phase" in
  cfp-first-stage|cfp-admission|cfp-schedule|cfp-travel-ready|workshop-commerce)
    ;;
  ""|-h|--help)
    usage
    exit 0
    ;;
  *)
    echo "Unknown seed phase: $phase" >&2
    usage >&2
    exit 1
    ;;
esac

run_sql_file() {
  local file="$1"
  echo "Applying $file"
  docker exec -i "$db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres < "$file"
}

echo "Resetting Supabase without automatic seed..."
if ! supabase db reset --no-seed; then
  echo "supabase db reset reported an error. Continuing to seed directly; SQL will fail if the schema is not ready." >&2
fi

run_sql_file "supabase/seed-local-cfp.sql"

case "$phase" in
  cfp-first-stage)
    run_sql_file "supabase/seeds/10-cfp-first-stage.sql"
    ;;
  cfp-admission)
    run_sql_file "supabase/seeds/20-cfp-admission.sql"
    ;;
  cfp-schedule)
    run_sql_file "supabase/seeds/30-cfp-schedule.sql"
    ;;
  cfp-travel-ready)
    run_sql_file "supabase/seeds/30-cfp-schedule.sql"
    run_sql_file "supabase/seeds/35-cfp-travel-ready.sql"
    ;;
  workshop-commerce)
    run_sql_file "supabase/seeds/40-workshop-commerce.sql"
    ;;
esac

echo "Seed phase '$phase' applied."
