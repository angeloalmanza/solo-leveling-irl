# Build context = repo root (vedi docker-compose.yml). Monorepo npm workspaces.
# ── Builder ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY mobile/package.json ./mobile/
RUN npm ci

COPY shared ./shared
RUN npm run build --workspace=@solo/shared

COPY backend ./backend
RUN npx prisma generate --schema backend/prisma/schema.prisma
RUN npm run build --workspace=backend

# ── Runtime ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
# All'avvio: migrate deploy + seed idempotente + server
CMD ["./docker-entrypoint.sh"]
