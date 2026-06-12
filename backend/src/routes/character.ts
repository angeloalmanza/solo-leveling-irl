import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { applyInactivityPenalty, getDynamicTitle, saveSnapshotIfNeeded } from '../services/levelService';
import { asyncHandler } from '../utils/asyncHandler';
import { todayFor } from '../lib/dates';
import { getUserContext, invalidateUserContext } from '../lib/userContext';

const router = Router();

router.get('/me', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  let character = await prisma.character.findUnique({
    where: { userId },
    include: { unlockedAchievements: { include: { achievement: true } } },
  });
  if (!character) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  const { tz } = await getUserContext(userId);
  const penalty = await applyInactivityPenalty(character.id, tz);

  if (penalty) {
    character = await prisma.character.findUniqueOrThrow({
      where: { userId },
      include: { unlockedAchievements: { include: { achievement: true } } },
    });

    // Quest di Ritorno: una sola per giorno, solo se non già presente
    const today = todayFor(tz);
    const existing = await prisma.dailyQuest.findFirst({
      where: { characterId: character.id, date: today, isRecovery: true },
    });
    if (!existing) {
      await prisma.dailyQuest.create({
        data: {
          characterId: character.id,
          date: today,
          title: 'Quest di Ritorno: Rientro nel Sistema',
          description: '15 minuti di camminata o stretching. Il Sistema ti aspettava, Hunter.',
          category: 'fitness',
          xpReward: 20,
          statRewards: { vit: 1 },
          difficulty: 1,
          isRecovery: true,
          recoveryBonusXp: Math.floor(penalty.xpLost / 2),
        },
      });
    }
  }

  await saveSnapshotIfNeeded(character.id, todayFor(tz));
  const activeTitle = getDynamicTitle(character);
  res.json({ ...character, activeTitle, penalty: penalty ?? null });
}));

const PatchSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  activeTitle: z.string().nullable().optional(),
});

router.patch('/me', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const parsed = PatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const character = await prisma.character.update({
    where: { userId },
    data: parsed.data,
  });
  res.json(character);
}));

const GoalsSchema = z.object({ goals: z.array(z.string().trim().min(1).max(100)).max(3) });

router.get('/goals', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId }, select: { goals: true } });
  res.json(profile);
}));

router.patch('/goals', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const parsed = GoalsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const profile = await prisma.userProfile.update({
    where: { userId },
    data: { goals: parsed.data.goals },
    select: { goals: true },
  });
  invalidateUserContext(userId);
  res.json(profile);
}));

export default router;
