# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder

WORKDIR /app

# Install workspace dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY docs/package.json ./docs/package.json
COPY monitor-agent/package.json ./monitor-agent/package.json
COPY shared/package.json ./shared/package.json
RUN pnpm install --frozen-lockfile --filter rybbit-backend... --filter @rybbit/shared

# Copy source code
COPY shared ./shared
COPY server ./server

# Build the application
RUN pnpm --filter @rybbit/shared build
RUN pnpm --filter rybbit-backend build

# Runtime image
FROM base

WORKDIR /app/server

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
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy built application and dependencies
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/shared /app/shared
COPY --from=builder /app/server/package.json ./package.json
COPY --from=builder /app/server/GeoLite2-City.mmdb ./GeoLite2-City.mmdb
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=builder /app/server/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/server/drizzle ./drizzle
COPY --from=builder /app/server/public ./public
COPY --from=builder /app/server/src ./src

# Make the entrypoint executable
RUN chmod +x /docker-entrypoint.sh

# Expose the API port
EXPOSE 3001

# Use our custom entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/cluster.js"]
