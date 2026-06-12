import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { generateWeeklyBoss } from '../services/aiService';
import { applyXP, applyStats, getDynamicTitle } from '../services/levelService';
import { runUnlockCheck } from '../services/unlockService';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { getTimezone, weekStartFor, todayFor } from '../lib/dates';

const router = Router();

router.get('/weekly', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({
    where: { userId },
  });

  const weekStart = weekStartFor(await getTimezone(userId));

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
}));

router.post('/weekly/tasks/:taskId/complete', requireAuth, asyncHandler(async (req, res: Response) => {
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

  // Guard condizionale sullo stato corrente: evita doppi toggle concorrenti
  const toggled = await prisma.weeklyBossTask.updateMany({
    where: { id: task.id, completed: task.completed },
    data: {
      completed: !task.completed,
      completedAt: !task.completed ? new Date() : null,
    },
  });
  if (toggled.count !== 1) throw new HttpError(409, 'Task già aggiornato, riprova');

  const boss = await prisma.weeklyBoss.findUniqueOrThrow({
    where: { id: task.bossId },
    include: { tasks: true },
  });
  const updated = boss.tasks.find((t) => t.id === task.id);

  res.json({ task: updated, boss });
}));

router.post('/weekly/defeat', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({
    where: { userId },
  });

  const tz = await getTimezone(userId);
  const weekStart = weekStartFor(tz);

  const boss = await prisma.weeklyBoss.findUnique({
    where: { characterId_weekStart: { characterId: char.id, weekStart } },
    include: { tasks: true },
  });

  if (!boss) throw new HttpError(404, 'Nessun boss questa settimana');
  if (boss.defeatedAt) throw new HttpError(400, 'Boss già sconfitto');
  if (!boss.tasks.every((t) => t.completed)) {
    throw new HttpError(400, 'Non tutti i task sono completati');
  }

  const outcome = await prisma.$transaction(async (tx) => {
    // Guard atomico: solo la prima richiesta concorrente passa
    const upd = await tx.weeklyBoss.updateMany({
      where: { id: boss.id, defeatedAt: null },
      data: { defeatedAt: new Date() },
    });
    if (upd.count !== 1) return { alreadyDefeated: true as const };

    await applyStats(char.id, boss.statRewards as Record<string, number>, tx);
    // Il boss dà una ricompensa settimanale FISSA: nessun moltiplicatore di streak.
    const levelResult = await applyXP(char.id, boss.xpReward, todayFor(tz), tx);
    return { levelResult };
  });

  if ('alreadyDefeated' in outcome) throw new HttpError(400, 'Boss già sconfitto');

  const newlyUnlocked = await runUnlockCheck(char.id);
  const updatedChar = await prisma.character.findUniqueOrThrow({ where: { id: char.id } });

  res.json({
    ...outcome.levelResult,
    newlyUnlocked,
    character: { ...updatedChar, activeTitle: getDynamicTitle(updatedChar) },
  });
}));

export default router;
