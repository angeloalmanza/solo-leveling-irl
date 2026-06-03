import { config } from 'dotenv';
config({ override: true });
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import characterRoutes from './routes/character';
import questRoutes from './routes/quests';
import nutritionRoutes from './routes/nutrition';
import unlockRoutes from './routes/unlocks';

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
