import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

const router = Router();

router.get('/shadows', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });

  const [shadows, unlocked] = await Promise.all([
    prisma.shadow.findMany({ orderBy: { name: 'asc' } }),
    prisma.unlockedShadow.findMany({
      where: { characterId: character.id },
      select: { shadowId: true, unlockedAt: true },
    }),
  ]);

  const unlockedMap = new Map(unlocked.map((u) => [u.shadowId, u.unlockedAt]));

  res.json(
    shadows.map((s) => ({
      ...s,
      unlocked: unlockedMap.has(s.id),
      unlockedAt: unlockedMap.get(s.id) ?? null,
    }))
  );
});

router.get('/achievements', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });

  const [achievements, unlocked] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { name: 'asc' } }),
    prisma.unlockedAchievement.findMany({
      where: { characterId: character.id },
      select: { achievementId: true, unlockedAt: true },
    }),
  ]);

  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

  res.json(
    achievements.map((a) => ({
      ...a,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) ?? null,
    }))
  );
});

export default router;
