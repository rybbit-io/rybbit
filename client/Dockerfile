FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install workspace dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY docs/package.json ./docs/package.json
COPY monitor-agent/package.json ./monitor-agent/package.json
COPY shared/package.json ./shared/package.json
RUN pnpm install --frozen-lockfile --filter client... --filter @rybbit/shared

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY shared/ ./shared
COPY client/ ./client

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_DISABLE_SIGNUP
ARG NEXT_PUBLIC_CLOUD
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_DISABLE_SIGNUP=${NEXT_PUBLIC_DISABLE_SIGNUP}
ENV NEXT_PUBLIC_CLOUD=${NEXT_PUBLIC_CLOUD}
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}

WORKDIR /app/client
RUN pnpm --filter @rybbit/shared build
RUN pnpm --filter client build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/client/public ./client/public

# Set the correct permission for prerender cache
RUN mkdir -p client/.next
RUN chown nextjs:nodejs client/.next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/client/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/client/.next/static ./client/.next/static

USER nextjs

EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["node", "client/server.js"]
