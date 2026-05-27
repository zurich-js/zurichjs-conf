set dotenv-load := false

default:
    just --list

# Start local Docker dev with 1Password secret injection.
dev:
    scripts/docker-dev.sh -d

# Alias for dev.
docker-dev:
    scripts/docker-dev.sh -d

# Stop local Docker dev and Supabase containers.
down:
    scripts/docker-down.sh

# Alias for down.
docker-down:
    scripts/docker-down.sh

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

# Run the same high-signal checks CI should care about, inside Docker.
check-full:
    just varlock
    just lint
    just typecheck
    just test
    just build
