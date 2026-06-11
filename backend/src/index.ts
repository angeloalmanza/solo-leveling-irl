import { config } from 'dotenv';
config({ override: true });
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import characterRoutes from './routes/character';
import questRoutes from './routes/quests';
import nutritionRoutes from './routes/nutrition';
import unlockRoutes from './routes/unlocks';
import bossRoutes from './routes/boss';
import progressRoutes from './routes/progress';
import bodyRoutes from './routes/body';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
