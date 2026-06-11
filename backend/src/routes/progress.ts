import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

const router = Router();

router.get('/calendar', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });

  const year = parseInt(req.query.year as string) || new Date().getUTCFullYear();
  const month = parseInt(req.query.month as string) || new Date().getUTCMonth() + 1;

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  const quests = await prisma.dailyQuest.findMany({
    where: { characterId: char.id, date: { gte: from, lt: to } },
  });

  const byDate: Record<string, { total: number; completed: number }> = {};
  for (const q of quests) {
    const key = new Date(q.date).toISOString().split('T')[0];
    if (!byDate[key]) byDate[key] = { total: 0, completed: 0 };
    byDate[key].total++;
    if (q.completed) byDate[key].completed++;
  }

  const result = Object.entries(byDate).map(([date, { total, completed }]) => ({
    date,
    total,
    completed,
  }));

  res.json(result);
});

router.get('/stats', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 60);

  const snapshots = await prisma.statSnapshot.findMany({
    where: { characterId: char.id, date: { gte: since } },
    orderBy: { date: 'asc' },
  });

  res.json({
    current: { str: char.str, agi: char.agi, int: char.int, end: char.end, vit: char.vit, level: char.level },
    snapshots: snapshots.map((s) => ({
      date: new Date(s.date).toISOString().split('T')[0],
      str: s.str,
      agi: s.agi,
      int: s.int,
      end: s.end,
      vit: s.vit,
      level: s.level,
    })),
  });
});

export default router;
