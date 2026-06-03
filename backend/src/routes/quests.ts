import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { applyXP, applyStats } from '../services/levelService';

const router = Router();

router.get('/daily', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.dailyQuest.findMany({
    where: { characterId: character.id, date: today },
    include: { questTemplate: true },
    orderBy: { questTemplate: { category: 'asc' } },
  });

  if (existing.length > 0) {
    res.json(existing);
    return;
  }

  const fitnessTemplates = await prisma.questTemplate.findMany({
    where: { category: 'fitness' },
    orderBy: { id: 'asc' },
  });
  const menteTemplates = await prisma.questTemplate.findMany({
    where: { category: 'mente' },
    orderBy: { id: 'asc' },
  });

  const pick = <T>(arr: T[], n: number): T[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };

  const selected = [
    ...pick(fitnessTemplates, 2),
    ...pick(menteTemplates, 2),
  ];

  const created = await prisma.$transaction(
    selected.map((t) =>
      prisma.dailyQuest.create({
        data: { characterId: character.id, questTemplateId: t.id, date: today },
        include: { questTemplate: true },
      })
    )
  );

  res.json(created);
});

router.post('/daily/:id/complete', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });

  const quest = await prisma.dailyQuest.findFirst({
    where: { id: req.params.id, characterId: character.id },
    include: { questTemplate: true },
  });

  if (!quest) {
    res.status(404).json({ error: 'Quest not found' });
    return;
  }
  if (quest.completed) {
    res.status(409).json({ error: 'Quest already completed' });
    return;
  }

  await prisma.dailyQuest.update({
    where: { id: quest.id },
    data: { completed: true, completedAt: new Date() },
  });

  const statRewards = quest.questTemplate.statRewards as Record<string, number>;
  await applyStats(character.id, statRewards);
  const levelResult = await applyXP(character.id, quest.questTemplate.xpReward);

  const updatedCharacter = await prisma.character.findUniqueOrThrow({ where: { id: character.id } });

  res.json({ character: updatedCharacter, ...levelResult });
});

export default router;
