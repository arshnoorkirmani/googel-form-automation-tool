FROM mcr.microsoft.com/playwright:v1.59.1-noble AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

WORKDIR /app

COPY . .
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.59.1-noble AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/config ./config
COPY --from=builder /app/storage ./storage

EXPOSE 3000

CMD ["node", "server.js"]
