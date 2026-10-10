# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# The runtime image supplies Chromium through apk.
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY shared/package.json ./shared/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter rybbit-backend... install --frozen-lockfile --store-dir /pnpm/store

FROM deps AS builder
COPY shared/ ./shared
COPY server/ ./server
RUN pnpm run build:server
# Keep workspace links during development; deploy materializes a portable tree.
# drizzle-kit is a production dependency because the entrypoint runs migrations.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter rybbit-backend deploy --legacy --prod --store-dir /pnpm/store /prod/server

# Runtime image
FROM node:24-alpine

WORKDIR /app

# Install PostgreSQL client for migrations and Chromium for Puppeteer PDF generation
RUN apk add --no-cache \
    postgresql-client \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configure Puppeteer to use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copy built application and dependencies
COPY --from=builder /prod/server ./

# Make the entrypoint executable
RUN chmod +x ./docker-entrypoint.sh

# Expose the API port
EXPOSE 3001

# Use our custom entrypoint script
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/cluster.js"]
