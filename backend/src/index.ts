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
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimit';

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
app.use('/nutrition/photo-parse', express.json({ limit: '10mb' }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.use('/auth', authRoutes);
app.use('/character', characterRoutes);
app.use('/quests', questRoutes);
app.use('/nutrition', nutritionRoutes);
app.use('/unlocks', unlockRoutes);
app.use('/boss', bossRoutes);
app.use('/progress', progressRoutes);
app.use('/body', bodyRoutes);
app.use('/skills', skillsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

if (env.NODE_ENV !== 'test') {
  cleanupExpiredRefreshTokens().catch((err) => logger.error({ err }, 'Token cleanup failed'));
  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });
}

export default app;
