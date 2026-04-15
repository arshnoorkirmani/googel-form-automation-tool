# ──────────────────────────────────────────────────────
# Docker build for Render and optional local containerised runs.
#
# NOTE: Requires output: "standalone" in next.config.ts.
# render.yaml points Render at this Dockerfile.
# ──────────────────────────────────────────────────────

FROM mcr.microsoft.com/playwright:v1.51.0-noble AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

WORKDIR /app

COPY . .
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.51.0-noble AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=10000
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/config ./config

EXPOSE 10000

CMD ["node", "server.js"]
