import { env } from './lib/env';
import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger';
import authRoutes from './routes/auth';
import characterRoutes from './routes/character';
import questRoutes from './routes/quests';
import nutritionRoutes from './routes/nutrition';
import unlockRoutes from './routes/unlocks';
import bossRoutes from './routes/boss';
import progressRoutes from './routes/progress';
import bodyRoutes from './routes/body';
import skillsRoutes from './routes/skills';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });
}

export default app;
