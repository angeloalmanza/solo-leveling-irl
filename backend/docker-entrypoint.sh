#!/bin/sh
set -e

echo "→ Applico le migrazioni del database..."
npx prisma migrate deploy --schema=backend/prisma/schema.prisma

echo "→ Seed (idempotente: salta se già popolato)..."
npx tsx backend/prisma/seed.ts || echo "seed saltato/non riuscito (non bloccante)"

echo "→ Avvio del server..."
exec node backend/dist/index.js
