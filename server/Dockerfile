# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

# Copy and build shared package first
COPY shared ./shared
WORKDIR /app/shared
RUN npm install && npm run build

# Install server dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --legacy-peer-deps

# Copy server source code
COPY server/ .

# npm installs the file:../shared dependency as a relative symlink
# (node_modules/@rybbit/shared -> ../../../shared). The runtime stage re-homes
# node_modules from /app/server to /app, which leaves that link pointing at
# /shared — outside the image. Materialize it into a real directory so the
# copied node_modules is location-independent.
RUN rm -rf node_modules/@rybbit/shared \
 && mkdir -p node_modules/@rybbit/shared \
 && cp -r /app/shared/package.json /app/shared/dist node_modules/@rybbit/shared/

# Build the application
RUN npm run build

# Runtime image
FROM node:20-alpine

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
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy built application and dependencies
COPY --from=builder /app/server/package*.json ./
COPY --from=builder /app/server/GeoLite2-City.mmdb ./GeoLite2-City.mmdb
COPY --from=builder /app/server/GeoLite2-ASN.mmdb ./GeoLite2-ASN.mmdb
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
