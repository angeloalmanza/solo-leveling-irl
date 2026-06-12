import { env, corsOrigins } from './lib/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger';
import authRoutes, { cleanupExpiredRefreshTokens } from './routes/auth';
import characterRoutes from './routes/character';
import questRoutes from './routes/quests';
import nutritionRoutes from './routes/nutrition';
import unlockRoutes from './routes/unlocks';
import bossRoutes from './routes/boss';
import progressRoutes from './routes/progress';
import bodyRoutes from './routes/body';
import skillsRoutes from './routes/skills';
import accountRoutes from './routes/account';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimit';
import { prisma } from './lib/prisma';
import { Router } from 'express';

const app = express();

// API dinamica e per-utente: niente ETag/304 condizionali (il client okhttp
// poteva ricevere 304 con body vuoto e svuotare lo store).
app.set('etag', false);
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    // Whitelist da env; se vuota (dev) accetta tutte le origin.
    origin: corsOrigins.length > 0 ? corsOrigins : true,
  })
);
app.use(pinoHttp({ logger }));
app.use(globalLimiter);

// Upload foto pasto: body grande solo su questa route (default 1mb altrove).
app.use('/v1/nutrition/photo-parse', express.json({ limit: '10mb' }));
app.use(express.json({ limit: '1mb' }));

// Health check: verifica anche la raggiungibilità del DB
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', version: '1.0.0', db: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

// API versionata sotto /v1 (per evolvere senza rompere i client esistenti)
const v1 = Router();
v1.use('/auth', authRoutes);
v1.use('/character', characterRoutes);
v1.use('/quests', questRoutes);
v1.use('/nutrition', nutritionRoutes);
v1.use('/unlocks', unlockRoutes);
v1.use('/boss', bossRoutes);
v1.use('/progress', progressRoutes);
v1.use('/body', bodyRoutes);
v1.use('/skills', skillsRoutes);
v1.use('/account', accountRoutes);
app.use('/v1', v1);

app.use(notFoundHandler);
app.use(errorHandler);

if (env.NODE_ENV !== 'test') {
  cleanupExpiredRefreshTokens().catch((err) => logger.error({ err }, 'Token cleanup failed'));
  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });
}

export default app;
