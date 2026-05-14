FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder

# Install required system packages
RUN apk add --no-cache \
    curl \
    bind-tools \
    iputils-ping

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY monitor-agent/package.json ./monitor-agent/package.json
COPY monitor-agent/tsconfig.json ./monitor-agent/tsconfig.json

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile --filter rybbit-monitor-agent

# Copy source code
COPY monitor-agent/src ./monitor-agent/src

# Build TypeScript
RUN pnpm --filter rybbit-monitor-agent build

FROM base AS runner

# Install required system packages
RUN apk add --no-cache \
    curl \
    bind-tools \
    iputils-ping

WORKDIR /app

# Install production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY monitor-agent/package.json ./monitor-agent/package.json
RUN pnpm install --prod --frozen-lockfile --filter rybbit-monitor-agent

WORKDIR /app/monitor-agent
COPY --from=builder /app/monitor-agent/dist ./dist

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Run the application
CMD ["node", "dist/index.js"]
