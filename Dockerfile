FROM node:22-bookworm-slim

ARG PNPM_VERSION=10.30.3
ARG SUPABASE_CLI_VERSION=2.95.4

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
ENV IN_DOCKER=1
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    docker.io \
    git \
    openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare pnpm@${PNPM_VERSION} --activate

RUN arch="$(dpkg --print-architecture)" \
  && case "$arch" in \
    amd64) supabase_arch="amd64" ;; \
    arm64) supabase_arch="arm64" ;; \
    *) echo "Unsupported architecture for Supabase CLI: $arch" >&2; exit 1 ;; \
  esac \
  && curl -fsSL \
    "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION}_linux_${supabase_arch}.deb" \
    -o /tmp/supabase.deb \
  && dpkg -i /tmp/supabase.deb \
  && rm /tmp/supabase.deb

WORKDIR /app

CMD ["bash"]
