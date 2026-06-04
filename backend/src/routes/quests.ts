import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { applyXP, applyStats } from '../services/levelService';
import { runUnlockCheck } from '../services/unlockService';
import { generateDailyQuests } from '../services/aiService';

const router = Router();

router.get('/daily', requireAuth, async (req, res: Response) => {
  try {
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

    let aiQuests = null;
    try {
      aiQuests = await generateDailyQuests({
        level: character.level,
        rank: character.rank,
        str: character.str,
        agi: character.agi,
        int: character.int,
        end: character.end,
        vit: character.vit,
      });
    } catch (err) {
      console.error('AI quest generation failed, falling back to DB templates:', err);
    }

    if (aiQuests && aiQuests.length >= 2) {
      const fitness = aiQuests.filter((q) => q.category === 'fitness').slice(0, 2);
      const mente = aiQuests.filter((q) => q.category === 'mente').slice(0, 2);
      const toCreate = [...fitness, ...mente];

      if (toCreate.length >= 2) {
        const results: typeof existing = [];
        for (const q of toCreate) {
          const template = await prisma.questTemplate.create({
            data: {
              title: q.title,
              description: q.description,
              category: q.category as 'fitness' | 'mente',
              xpReward: q.xpReward,
              statRewards: q.statRewards,
              difficulty: q.difficulty,
            },
          });
          const dailyQuest = await prisma.dailyQuest.create({
            data: { characterId: character.id, questTemplateId: template.id, date: today },
            include: { questTemplate: true },
          });
          results.push(dailyQuest);
        }
        res.json(results);
        return;
      }
    }

    // Fallback: random from existing templates
    const fitnessTemplates = await prisma.questTemplate.findMany({ where: { category: 'fitness' } });
    const menteTemplates = await prisma.questTemplate.findMany({ where: { category: 'mente' } });
    const pick = <T>(arr: T[], n: number): T[] => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
    const selected = [...pick(fitnessTemplates, 2), ...pick(menteTemplates, 2)];

    const created = await prisma.$transaction(
      selected.map((t) =>
        prisma.dailyQuest.create({
          data: { characterId: character.id, questTemplateId: t.id, date: today },
          include: { questTemplate: true },
        })
      )
    );

    res.json(created);
  } catch (err) {
    console.error('GET /daily error:', err);
    res.status(500).json({ error: 'Errore nel caricamento delle quest' });
  }
});

router.post('/daily/refresh', requireAuth, async (req, res: Response) => {
  try {
    const userId = (req as AuthRequest).userId;
    const character = await prisma.character.findUniqueOrThrow({ where: { userId } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayQuests = await prisma.dailyQuest.findMany({
      where: { characterId: character.id, date: today },
      include: { questTemplate: true },
    });

    const completed = todayQuests.filter((q) => q.completed);
    const fitnessCompleted = completed.filter((q) => q.questTemplate.category === 'fitness').length;
    const menteCompleted = completed.filter((q) => q.questTemplate.category === 'mente').length;
    const fitnessNeeded = Math.max(0, 2 - fitnessCompleted);
    const menteNeeded = Math.max(0, 2 - menteCompleted);

    await prisma.dailyQuest.deleteMany({
      where: { characterId: character.id, date: today, completed: false },
    });

    if (fitnessNeeded === 0 && menteNeeded === 0) {
      res.json(completed);
      return;
    }

    let aiQuests = null;
    try {
      aiQuests = await generateDailyQuests({
        level: character.level, rank: character.rank,
        str: character.str, agi: character.agi, int: character.int,
        end: character.end, vit: character.vit,
      });
    } catch (err) {
      console.error('AI quest generation failed on refresh:', err);
    }

    const newDailyQuests: typeof todayQuests = [];

    if (aiQuests) {
      const newFitness = aiQuests.filter((q) => q.category === 'fitness').slice(0, fitnessNeeded);
      const newMente = aiQuests.filter((q) => q.category === 'mente').slice(0, menteNeeded);
      for (const q of [...newFitness, ...newMente]) {
        const template = await prisma.questTemplate.create({
          data: {
            title: q.title, description: q.description,
            category: q.category as 'fitness' | 'mente',
            xpReward: q.xpReward, statRewards: q.statRewards, difficulty: q.difficulty,
          },
        });
        const dq = await prisma.dailyQuest.create({
          data: { characterId: character.id, questTemplateId: template.id, date: today },
          include: { questTemplate: true },
        });
        newDailyQuests.push(dq);
      }
    } else {
      const pick = <T>(arr: T[], n: number): T[] => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
      const ft = await prisma.questTemplate.findMany({ where: { category: 'fitness' } });
      const mt = await prisma.questTemplate.findMany({ where: { category: 'mente' } });
      for (const t of [...pick(ft, fitnessNeeded), ...pick(mt, menteNeeded)]) {
        const dq = await prisma.dailyQuest.create({
          data: { characterId: character.id, questTemplateId: t.id, date: today },
          include: { questTemplate: true },
        });
        newDailyQuests.push(dq);
      }
    }

    res.json([...completed, ...newDailyQuests]);
  } catch (err) {
    console.error('Refresh quests error:', err);
    res.status(500).json({ error: 'Errore nel refresh delle quest' });
  }
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
    // Undo: remove XP and stats
    const statRewards = quest.questTemplate.statRewards as Record<string, number>;
    const negativeStats = Object.fromEntries(
      Object.entries(statRewards).map(([k, v]) => [k, -v])
    );
    await applyStats(character.id, negativeStats);
    await prisma.character.update({
      where: { id: character.id },
      data: { xp: { decrement: quest.questTemplate.xpReward } },
    });
    await prisma.dailyQuest.update({
      where: { id: quest.id },
      data: { completed: false, completedAt: null },
    });
    const updatedCharacter = await prisma.character.findUniqueOrThrow({ where: { id: character.id } });
    res.json({ character: updatedCharacter, leveledUp: false, rankedUp: false, newlyUnlocked: [], undone: true });
    return;
  }

  await prisma.dailyQuest.update({
    where: { id: quest.id },
    data: { completed: true, completedAt: new Date() },
  });

  const statRewards = quest.questTemplate.statRewards as Record<string, number>;
  await applyStats(character.id, statRewards);
  const levelResult = await applyXP(character.id, quest.questTemplate.xpReward);

  const [updatedCharacter, newlyUnlocked] = await Promise.all([
    prisma.character.findUniqueOrThrow({ where: { id: character.id } }),
    runUnlockCheck(character.id),
  ]);

  res.json({ character: updatedCharacter, ...levelResult, newlyUnlocked });
});

export default router;
