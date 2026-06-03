set dotenv-load := false

default:
    just --list

# Start local Docker dev detached with 1Password secret injection.
up:
    scripts/docker-dev.sh -d

# Alias for up.
dev:
    just up

# Alias for up.
docker-up:
    just up

# Backward-compatible alias for up.
docker-dev:
    just up

# Stop local Docker dev and Supabase containers.
down:
    scripts/docker-down.sh

# Backward-compatible alias for down.
docker-down:
    just down

# Open a shell in the Node container.
shell:
    scripts/docker-run.sh bash

# Authenticate the Supabase CLI inside the Docker-managed CLI volume.
supabase-login:
    scripts/supabase-login.sh

# Validate Varlock schema/env loading inside Docker.
varlock:
    scripts/docker-run.sh pnpm exec varlock load

# Run oxlint inside Docker.
lint:
    scripts/docker-run.sh pnpm exec oxlint --fix

# Run the safe per-file checks used by lint-staged. Usage: just lint-staged-check src/foo.ts
lint-staged-check *files:
    scripts/docker-run.sh pnpm exec oxlint --fix {{files}}
    scripts/docker-run.sh pnpm exec vitest related --run {{files}}

# Run TypeScript typecheck inside Docker.
typecheck:
    scripts/docker-run.sh pnpm exec tsc --noEmit

# Run the full Vitest suite inside Docker.
test:
    scripts/docker-run.sh pnpm exec vitest run

# Run related Vitest tests inside Docker. Usage: just test-related src/foo.ts
test-related *files:
    scripts/docker-run.sh pnpm exec vitest related --run {{files}}

# Run Docker-local lint + typecheck + related tests for changed files.
check:
    scripts/agent-precheck.sh

# Run a production Next.js build inside Docker.
build:
    scripts/docker-run.sh pnpm exec next build

# Reset local Supabase and apply the CFP first-stage seed.
seed-cfp-first-stage:
    scripts/seed-supabase-phase.sh cfp-first-stage

# Reset local Supabase and apply the CFP admission seed.
seed-cfp-admission:
    scripts/seed-supabase-phase.sh cfp-admission

# Reset local Supabase and apply the CFP schedule seed.
seed-cfp-schedule:
    scripts/seed-supabase-phase.sh cfp-schedule

# Reset local Supabase and apply the workshop commerce seed.
seed-workshop-commerce:
    scripts/seed-supabase-phase.sh workshop-commerce

# Run the same high-signal checks CI should care about, inside Docker.
check-full:
    just varlock
    just lint
    just typecheck
    just test
    just build
