# Solo Leveling IRL

App di self-improvement gamificata ispirata a *Solo Leveling*: quest giornaliere generate dall'AI, sistema di livelli/rank/streak, boss settimanali, skill tree, tracker nutrizione con scanner foto AI, ombre e achievement.

## Architettura

Monorepo con npm workspaces:

```
.
├── backend/      API Node.js + Express + Prisma + PostgreSQL
├── mobile/       App React Native + Expo (expo-router, Zustand)
├── shared/       @solo/shared — formule di gioco condivise (xpForNextLevel, streakMultiplier, calcRank)
└── docker-compose.yml
```

- **Backend**: Express 4, Prisma (PostgreSQL), JWT con refresh token rotanti, rate limiting, helmet, logging strutturato (pino), AI via Groq (LLaMA 3.3 70B + Llama 4 Scout per la vision). API versionata sotto `/v1`.
- **Mobile**: Expo SDK 54, expo-router, Zustand, axios con refresh single-flight.
- **shared**: unica fonte di verità per le formule di gioco, importata da backend e mobile.

## Prerequisiti

- Node.js 20+
- Docker (per PostgreSQL)
- Un dispositivo con Expo Go (o un emulatore)

## Setup

```bash
# 1. Installa le dipendenze di tutti i workspace
npm install

# 2. Compila il package condiviso (necessario per backend e mobile)
npm run build:shared

# 3. Avvia PostgreSQL
docker compose up -d db

# 4. Configura il backend
cp backend/.env.example backend/.env   # poi compila i valori (vedi sotto)
cd backend
npx prisma migrate deploy
npm run db:seed                          # quest template di fallback, ombre, achievement, food
cd ..

# 5. Configura il mobile
cp mobile/.env.example mobile/.env       # imposta EXPO_PUBLIC_API_URL con l'IP LAN
```

### Variabili d'ambiente

**backend/.env**

| Variabile | Descrizione |
|-----------|-------------|
| `DATABASE_URL` | URL PostgreSQL (es. `postgresql://soloirl:soloirl_dev@localhost:5432/solo_leveling_irl`) |
| `JWT_ACCESS_SECRET` | Segreto per gli access token (min 16 caratteri) |
| `JWT_REFRESH_SECRET` | Segreto per i refresh token (min 16 caratteri) |
| `GROQ_API_KEY` | Chiave API Groq |
| `PORT` | Porta del server (default 3000) |
| `CORS_ORIGINS` | Origin consentite separate da virgola (vuoto = tutte, solo dev) |

Il server valida queste variabili all'avvio e si rifiuta di partire se mancano.

**mobile/.env**

| Variabile | Descrizione |
|-----------|-------------|
| `EXPO_PUBLIC_API_URL` | URL del backend, es. `http://192.168.1.2:3000`. Su Android in Expo Go usa l'IP della LAN, non `localhost`. |

## Avvio in sviluppo

```bash
npm run backend     # avvia il backend (tsx watch) sulla porta 3000
npm run mobile      # avvia Expo (scansiona il QR con Expo Go)
```

## Comandi utili (root)

| Comando | Cosa fa |
|---------|---------|
| `npm run backend` | Backend in watch mode |
| `npm run mobile` | Expo dev server |
| `npm run build:shared` | Compila il package `@solo/shared` |
| `npm run lint` | ESLint su tutto il monorepo |
| `npm run typecheck` | TypeScript su backend e mobile |
| `npm run typecheck:backend` | Solo backend |
| `npm test` | Suite di test del backend (richiede Postgres) |
| `npm run format` | Prettier |

### Backend (workspace)

| Comando | Cosa fa |
|---------|---------|
| `npm run dev -w backend` | Server in watch |
| `npm run db:migrate -w backend` | `prisma migrate dev` |
| `npm run db:seed -w backend` | Seed dei dati base |
| `npm run db:studio -w backend` | Prisma Studio |
| `npm test -w backend` | Vitest |

## Test

I test usano un database PostgreSQL dedicato. Crealo una volta:

```sql
CREATE DATABASE solo_leveling_test;
```

Poi:

```bash
npm test    # migra+seed il DB di test ed esegue 57 test (unit + integrazione)
```

`TEST_DATABASE_URL` può sovrascrivere l'URL del DB di test (default `…/solo_leveling_test`).

## API

Tutte le route applicative sono sotto `/v1` (es. `POST /v1/auth/login`, `GET /v1/quests/daily`).
`GET /health` (non versionata) verifica anche la connessione al DB.

## Docker (produzione)

```bash
# Build e avvio di backend + db
docker compose --profile full up --build
```

Il `Dockerfile` del backend è monorepo-aware (build multi-stage che compila `@solo/shared` e il backend).

## CI

GitHub Actions (`.github/workflows/ci.yml`) esegue su ogni push/PR: install → build shared → prisma generate → lint → typecheck → prisma validate → test (con servizio Postgres).
