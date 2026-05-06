set shell := ["bash", "-cu"]

compose := "docker compose"
tool := compose + " run --rm tools"

default:
	just --list

setup:
    {{compose}} build
    {{tool}} pnpm install --frozen-lockfile
    {{tool}} supabase start
    @if {{tool}} scripts/check-dev-env.sh; then \
        APP_PORT="$(scripts/base-url-port.sh)" {{compose}} up -d --force-recreate frontend; \
        echo "Setup complete. Frontend is running at $$(scripts/base-url.sh)"; \
    else \
        echo "Setup complete. Supabase is running, but frontend was not started because .env.local is incomplete."; \
    fi

dev:
    {{tool}} supabase start
    {{tool}} scripts/check-dev-env.sh
    APP_PORT="$(scripts/base-url-port.sh)" {{compose}} up -d --force-recreate frontend
    @echo "Frontend restarted at $$(scripts/base-url.sh)"

install:
	{{tool}} pnpm install --frozen-lockfile

lint:
	{{tool}} pnpm lint

env-check:
	{{tool}} pnpm env:check

test:
	{{tool}} pnpm test:run

test-coverage:
	{{tool}} pnpm test:coverage

typecheck:
	{{tool}} pnpm typecheck

build:
	{{tool}} pnpm build

check:
	just env-check
	just lint
	just typecheck
	just test

email-dev:
	{{tool}} pnpm email:dev

db-reset:
	{{tool}} supabase db reset

supabase *args:
	{{tool}} supabase {{args}}

db-seed phase:
	{{tool}} pnpm db:seed:{{phase}}

db-seed-cfp-first-stage:
	{{tool}} pnpm db:seed:cfp-first-stage

db-seed-cfp-admission:
	{{tool}} pnpm db:seed:cfp-admission

db-seed-cfp-schedule:
	{{tool}} pnpm db:seed:cfp-schedule

db-seed-workshop-commerce:
	{{tool}} pnpm db:seed:workshop-commerce

shell:
	{{tool}} bash

down:
	{{compose}} down
