#!/usr/bin/env bash
set -euo pipefail

scripts/require-docker.sh

required_vars=(
  NEXT_PUBLIC_BASE_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  STRIPE_SECRET_KEY
  ADMIN_PASSWORD
)

optional_feature_vars=(
  STRIPE_WEBHOOK_SECRET
  RESEND_API_KEY
)

missing=()
missing_optional=()

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    missing+=("$var_name")
  fi
done

if [ -z "${SUPABASE_SECRET_KEY:-}" ]; then
  missing+=("SUPABASE_SECRET_KEY")
fi

for var_name in "${optional_feature_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    missing_optional+=("$var_name")
  fi
done

if [ "${#missing[@]}" -ne 0 ]; then
  cat >&2 <<'EOF'
Dev server environment is not ready yet.

Add the missing variables to .env.local, then run:
  just dev

For local Supabase values, run:
  just supabase status

EOF

  if [ "${#missing[@]}" -ne 0 ]; then
    printf 'Missing required variables:\n' >&2
    for var_name in "${missing[@]}"; do
      printf '  - %s\n' "$var_name" >&2
    done
  fi

  exit 1
fi

echo "Dev environment is ready."

if [ "${#missing_optional[@]}" -eq 0 ]; then
  exit 0
fi

cat >&2 <<'EOF'
Some feature-specific environment variables are missing.

The dev server can start, but these flows will not work until configured:

  - STRIPE_WEBHOOK_SECRET: Stripe webhook endpoint verification
  - RESEND_API_KEY: email sending through Resend

EOF

printf 'Missing optional variables:\n' >&2
for var_name in "${missing_optional[@]}"; do
  printf '  - %s\n' "$var_name" >&2
done

exit 0
