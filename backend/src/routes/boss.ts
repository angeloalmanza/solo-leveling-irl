import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { generateWeeklyBoss } from '../services/aiService';
import { applyXP, applyStats, getDynamicTitle } from '../services/levelService';
import { runUnlockCheck } from '../services/unlockService';

const router = Router();

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=dom, 1=lun...
  const diff = day === 0 ? -6 : 1 - day; // porta a lunedì
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

router.get('/weekly', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({
    where: { userId },
  });

  const weekStart = getWeekStart();

  let boss = await prisma.weeklyBoss.findUnique({
    where: { characterId_weekStart: { characterId: char.id, weekStart } },
    include: { tasks: true },
  });

  if (!boss) {
    const generated = await generateWeeklyBoss({
      level: char.level,
      rank: char.rank,
      str: char.str,
      agi: char.agi,
      int: char.int,
      end: char.end,
      vit: char.vit,
    });

    boss = await prisma.weeklyBoss.create({
      data: {
        characterId: char.id,
        weekStart,
        name: generated.name,
        description: generated.description,
        lore: generated.lore,
        xpReward: generated.xpReward,
        statRewards: generated.statRewards,
        difficulty: generated.difficulty,
        tasks: {
          create: generated.tasks,
        },
      },
      include: { tasks: true },
    });
  }

  res.json(boss);
});

router.post('/weekly/tasks/:taskId/complete', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({
    where: { userId },
  });

  const task = await prisma.weeklyBossTask.findUniqueOrThrow({
    where: { id: req.params.taskId },
    include: { boss: true },
  });

  if (task.boss.characterId !== char.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (task.boss.defeatedAt) {
    return res.status(400).json({ error: 'Boss già sconfitto' });
  }

  const updated = await prisma.weeklyBossTask.update({
    where: { id: task.id },
    data: {
      completed: !task.completed,
      completedAt: !task.completed ? new Date() : null,
    },
  });

  const boss = await prisma.weeklyBoss.findUniqueOrThrow({
    where: { id: task.bossId },
    include: { tasks: true },
  });

  res.json({ task: updated, boss });
});

router.post('/weekly/defeat', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({
    where: { userId },
  });

  const weekStart = getWeekStart();

  const boss = await prisma.weeklyBoss.findUnique({
    where: { characterId_weekStart: { characterId: char.id, weekStart } },
    include: { tasks: true },
  });

  if (!boss) return res.status(404).json({ error: 'Nessun boss questa settimana' });
  if (boss.defeatedAt) return res.status(400).json({ error: 'Boss già sconfitto' });

  const allDone = boss.tasks.every((t) => t.completed);
  if (!allDone) return res.status(400).json({ error: 'Non tutti i task sono completati' });

  await prisma.weeklyBoss.update({
    where: { id: boss.id },
    data: { defeatedAt: new Date() },
  });

  const levelResult = await applyXP(char.id, boss.xpReward);
  await applyStats(char.id, boss.statRewards as Record<string, number>);
  const newlyUnlocked = await runUnlockCheck(char.id);

  const updatedChar = await prisma.character.findUniqueOrThrow({ where: { id: char.id } });

  res.json({
    ...levelResult,
    newlyUnlocked,
    character: { ...updatedChar, activeTitle: getDynamicTitle(updatedChar) },
  });
});

export default router;
