# Deploy (uso personale) — Neon (DB) + Render (backend)

Obiettivo: backend + database online, così l'app funziona ovunque senza il Mac acceso.

## 1. Database su Neon (gratis)

1. Vai su https://neon.tech → **Sign up** (con GitHub o email).
2. **Create project** → nome a piacere, regione **Europe (Frankfurt)**, versione Postgres 16.
3. A progetto creato, copia la **connection string** (Dashboard → "Connect" → _Connection string_).
   Sarà tipo:
   `postgresql://utente:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
   Usa la stringa **diretta** (non quella con `-pooler`) — serve sia all'app che alle migrazioni.
4. Tienila da parte: è il valore di `DATABASE_URL`.

## 2. Backend su Render (gratis)

1. Assicurati che il repo `angeloalmanza/solo-leveling-irl` sia aggiornato su GitHub (push fatto).
2. Vai su https://render.com → **Sign up** con GitHub → autorizza l'accesso al repo.
3. **New** → **Blueprint** → seleziona il repo. Render legge `render.yaml` e propone il servizio
   `solo-leveling-irl-api` (Docker, piano free). Conferma **Apply**.
4. Render chiederà i valori delle variabili marcate `sync: false`. Inseriscili:

   | Variabile | Valore |
   |-----------|--------|
   | `DATABASE_URL` | la connection string di Neon (punto 1.3) |
   | `JWT_ACCESS_SECRET` | `a3c172c7255facb3dffea2f790d82dfd8a30349060b10024841b479885e944c3` |
   | `JWT_REFRESH_SECRET` | `a5de46c8e2f2b18b7ae6891fca1b626b4980aee22e1293e91d7bd06bb6893b7c` |
   | `GROQ_API_KEY` | la tua chiave Groq (è in `backend/.env`) |

   (`NODE_ENV` e `CORS_ORIGINS` sono già impostate dal blueprint.)
5. **Create / Deploy**. Il primo build dura qualche minuto. All'avvio il container esegue
   automaticamente migrazioni + seed (vedi `backend/docker-entrypoint.sh`).
6. A deploy finito Render mostra l'URL pubblico, tipo
   `https://solo-leveling-irl-api.onrender.com`.
7. Verifica: apri `https://<url>/health` nel browser → deve rispondere
   `{"status":"ok","db":"up"}`.

> Nota piano free: dopo ~15 min di inattività il servizio "dorme"; la prima richiesta
> successiva impiega 30-60s a svegliarlo, poi torna veloce.

## 3. APK puntato al backend online

Una volta che `https://<url>/health` risponde:

1. In `mobile/.env` imposta:
   `EXPO_PUBLIC_API_URL=https://<il-tuo-url>.onrender.com`
2. Genera l'APK (vedi sezione build) — l'URL viene "incastonato" nell'APK al momento della build.
3. Installa l'APK sul telefono: funzionerà ovunque, anche a Mac spento.

## Aggiornamenti futuri

Ogni `git push` su `main` fa ri-deployare Render automaticamente (migrazioni incluse).
