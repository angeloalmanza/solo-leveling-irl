import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { generateWeeklySummary } from '../services/aiService';

const summaryCache = new Map<string, { summary: string; generatedAt: Date }>();

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

router.get('/weekly-summary', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });

  const todayKey = new Date().toISOString().split('T')[0];
  const cacheKey = `${char.id}_${todayKey}`;
  const cached = summaryCache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const now = new Date();
  const weekStart = new Date(now);
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setUTCDate(now.getUTCDate() + diff);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  const [quests, boss, mealLogs, nutritionGoal, weekStartSnapshot] = await Promise.all([
    prisma.dailyQuest.findMany({
      where: { characterId: char.id, date: { gte: weekStart, lt: weekEnd } },
    }),
    prisma.weeklyBoss.findUnique({
      where: { characterId_weekStart: { characterId: char.id, weekStart } },
    }),
    prisma.mealLog.findMany({
      where: { characterId: char.id, date: { gte: weekStart, lt: weekEnd } },
      include: { items: { include: { food: true } } },
    }),
    prisma.nutritionGoal.findUnique({ where: { characterId: char.id } }),
    prisma.statSnapshot.findFirst({
      where: { characterId: char.id, date: { gte: weekStart } },
      orderBy: { date: 'asc' },
    }),
  ]);

  const questsCompleted = quests.filter((q) => q.completed).length;
  const questsTotal = quests.length;
  const bossDefeated = !!boss?.defeatedAt;

  // XP guadagnata: stima da level-up confrontando snapshot inizio settimana
  const xpGained = weekStartSnapshot
    ? Math.max(0, (char.level - weekStartSnapshot.level) * 100 + char.xp)
    : 0;

  // Stat aumentate questa settimana
  const statsGained: Record<string, number> = {};
  if (weekStartSnapshot) {
    const keys = ['str', 'agi', 'int', 'end', 'vit'] as const;
    for (const k of keys) {
      const diff = char[k] - weekStartSnapshot[k];
      if (diff > 0) statsGained[k] = diff;
    }
  }

  // Giorni con obiettivo calorico raggiunto
  let nutritionDaysOk = 0;
  if (nutritionGoal) {
    const byDay = new Map<string, number>();
    for (const log of mealLogs) {
      const key = new Date(log.date).toISOString().split('T')[0];
      const cals = log.items.reduce((sum, item) => sum + (item.food.calories * item.quantity) / 100, 0);
      byDay.set(key, (byDay.get(key) ?? 0) + cals);
    }
    for (const cals of byDay.values()) {
      if (cals >= nutritionGoal.calories * 0.85) nutritionDaysOk++;
    }
  }

  const summary = await generateWeeklySummary({
    questsCompleted,
    questsTotal,
    xpGained,
    statsGained,
    streak: char.streak,
    bossDefeated,
    nutritionDaysOk,
    level: char.level,
    rank: char.rank,
  });

  const result = { summary, generatedAt: new Date() };
  summaryCache.set(cacheKey, result);
  res.json(result);
});

export default router;
