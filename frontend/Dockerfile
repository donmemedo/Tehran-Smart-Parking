FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Strict, reproducible install: fails if the lockfile and package.json disagree.
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
# Next evaluates rewrites() and headers() at BUILD time and bakes them into the standalone
# output, so the proxy target (and the optional WS origin) must be given as build args.
# The same BACKEND_URL is also set as runtime ENV below for clarity and for `next start`.
ARG BACKEND_URL=http://backend:8000
ARG NEXT_PUBLIC_WS_URL=
ARG CSP_UPGRADE_INSECURE=1
ENV BACKEND_URL=$BACKEND_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    CSP_UPGRADE_INSECURE=$CSP_UPGRADE_INSECURE \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ARG BACKEND_URL=http://backend:8000
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    BACKEND_URL=$BACKEND_URL
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
