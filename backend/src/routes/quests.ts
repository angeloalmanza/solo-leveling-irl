import { Router, Response } from 'express';
import { z } from 'zod';
import { DailyQuest, QuestCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { applyXP, applyStats, updateStreak, getDynamicTitle } from '../services/levelService';
import { runUnlockCheck } from '../services/unlockService';
import { generateDailyQuests, generateSingleQuest, AIQuest } from '../services/aiService';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import { aiLimiter } from '../middleware/rateLimit';
import { todayFor } from '../lib/dates';
import { getUserContext } from '../lib/userContext';

const router = Router();

const UNDO_WINDOW_MS = 10 * 60 * 1000;

/** Risposta compatibile col client: i campi denormalizzati restano sotto questTemplate. */
function toApiQuest(q: DailyQuest) {
  return {
    id: q.id,
    completed: q.completed,
    completedAt: q.completedAt,
    feedback: q.feedback,
    isRecovery: q.isRecovery,
    recoveryBonusXp: q.recoveryBonusXp,
    questTemplate: {
      title: q.title,
      description: q.description,
      category: q.category,
      xpReward: q.xpReward,
      statRewards: q.statRewards,
      difficulty: q.difficulty,
    },
  };
}

/** Suggerisce di calibrare la difficoltà in base al feedback dell'ultima settimana. */
export async function computeDifficultyHint(
  characterId: string,
  today: Date
): Promise<'easier' | 'harder' | null> {
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - 7);
  const recent = await prisma.dailyQuest.findMany({
    where: { characterId, date: { gte: since, lt: today }, feedback: { not: null } },
    select: { feedback: true },
  });
  const hard = recent.filter((q) => q.feedback === 'hard').length;
  const easy = recent.filter((q) => q.feedback === 'easy').length;
  if (hard >= 2 && hard > easy) return 'easier';
  if (easy >= 3 && easy > hard) return 'harder';
  return null;
}

type QuestSeed = {
  title: string;
  description: string;
  category: QuestCategory;
  xpReward: number;
  statRewards: object;
  difficulty: number;
};

function aiToSeed(q: AIQuest): QuestSeed {
  return {
    title: q.title,
    description: q.description,
    category: q.category as QuestCategory,
    xpReward: q.xpReward,
    statRewards: q.statRewards,
    difficulty: q.difficulty,
  };
}

async function createQuests(characterId: string, date: Date, seeds: QuestSeed[]): Promise<DailyQuest[]> {
  // Tutte le quest del giorno create atomicamente: niente set parziali se una fallisce.
  return prisma.$transaction(
    seeds.map((s) =>
      prisma.dailyQuest.create({ data: { characterId, date, ...s, statRewards: s.statRewards as object } })
    )
  );
}

async function fallbackSeeds(fitnessNeeded: number, menteNeeded: number): Promise<QuestSeed[]> {
  const pick = <T>(arr: T[], n: number): T[] => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
  const ft = await prisma.questTemplate.findMany({ where: { category: 'fitness' } });
  const mt = await prisma.questTemplate.findMany({ where: { category: 'mente' } });
  return [...pick(ft, fitnessNeeded), ...pick(mt, menteNeeded)].map((t) => ({
    title: t.title,
    description: t.description,
    category: t.category,
    xpReward: t.xpReward,
    statRewards: t.statRewards as object,
    difficulty: t.difficulty,
  }));
}

router.get('/daily', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const { tz, goals } = await getUserContext(userId);
  const today = todayFor(tz);

  const existing = await prisma.dailyQuest.findMany({
    where: { characterId: character.id, date: today },
    orderBy: { category: 'asc' },
  });
  if (existing.length > 0) {
    res.json(existing.map(toApiQuest));
    return;
  }

  const difficultyHint = await computeDifficultyHint(character.id, today);

  let seeds: QuestSeed[] | null = null;
  try {
    const ai = await generateDailyQuests(character, { goals, difficultyHint });
    const fitness = ai.filter((q) => q.category === 'fitness').slice(0, 2);
    const mente = ai.filter((q) => q.category === 'mente').slice(0, 2);
    if (fitness.length + mente.length >= 2) {
      seeds = [...fitness, ...mente].map(aiToSeed);
    }
  } catch (err) {
    logger.warn({ err }, 'AI quest generation failed, falling back to DB templates');
  }

  if (!seeds) {
    seeds = await fallbackSeeds(2, 2);
  }

  const created = await createQuests(character.id, today, seeds);
  res.json(created.map(toApiQuest));
}));

router.post('/daily/refresh', requireAuth, aiLimiter, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const today = todayFor((await getUserContext(userId)).tz);

  const todayQuests = await prisma.dailyQuest.findMany({
    where: { characterId: character.id, date: today },
  });

  const completed = todayQuests.filter((q) => q.completed);
  const fitnessCompleted = completed.filter((q) => q.category === 'fitness').length;
  const menteCompleted = completed.filter((q) => q.category === 'mente').length;
  const fitnessNeeded = Math.max(0, 2 - fitnessCompleted);
  const menteNeeded = Math.max(0, 2 - menteCompleted);

  await prisma.dailyQuest.deleteMany({
    where: { characterId: character.id, date: today, completed: false },
  });

  if (fitnessNeeded === 0 && menteNeeded === 0) {
    res.json(completed.map(toApiQuest));
    return;
  }

  let seeds: QuestSeed[] | null = null;
  try {
    const ai = await generateDailyQuests(character);
    const newFitness = ai.filter((q) => q.category === 'fitness').slice(0, fitnessNeeded);
    const newMente = ai.filter((q) => q.category === 'mente').slice(0, menteNeeded);
    seeds = [...newFitness, ...newMente].map(aiToSeed);
  } catch (err) {
    logger.warn({ err }, 'AI quest generation failed on refresh');
    seeds = await fallbackSeeds(fitnessNeeded, menteNeeded);
  }

  const created = await createQuests(character.id, today, seeds);
  res.json([...completed, ...created].map(toApiQuest));
}));

router.post('/daily/:id/reroll', requireAuth, aiLimiter, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const today = todayFor((await getUserContext(userId)).tz);

  const quest = await prisma.dailyQuest.findFirst({
    where: { id: req.params.id, characterId: character.id },
  });
  if (!quest) throw new HttpError(404, 'Quest not found');
  if (quest.completed) throw new HttpError(400, 'Quest già completata');

  const category = quest.category;
  const otherTitles = (
    await prisma.dailyQuest.findMany({
      where: { characterId: character.id, date: today, id: { not: quest.id } },
      select: { title: true },
    })
  ).map((q) => q.title);

  let seed: QuestSeed;
  try {
    const newQuest = await generateSingleQuest(character, category, otherTitles);
    seed = aiToSeed(newQuest);
  } catch (err) {
    logger.warn({ err }, 'AI reroll failed, using fallback template');
    const fallbacks = await prisma.questTemplate.findMany({ where: { category } });
    const t = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    seed = {
      title: t.title,
      description: t.description,
      category: t.category,
      xpReward: t.xpReward,
      statRewards: t.statRewards as object,
      difficulty: t.difficulty,
    };
  }

  await prisma.dailyQuest.delete({ where: { id: quest.id } });
  const created = await prisma.dailyQuest.create({
    data: { characterId: character.id, date: today, ...seed, statRewards: seed.statRewards as object },
  });
  res.json(toApiQuest(created));
}));

router.post('/daily/:id/complete', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const today = todayFor((await getUserContext(userId)).tz);

  const quest = await prisma.dailyQuest.findFirst({
    where: { id: req.params.id, characterId: character.id },
  });
  if (!quest) throw new HttpError(404, 'Quest not found');

  const statRewards = quest.statRewards as Record<string, number>;

  // ── UNDO ──────────────────────────────────────────────────────────────
  if (quest.completed) {
    if (!quest.completedAt || Date.now() - new Date(quest.completedAt).getTime() > UNDO_WINDOW_MS) {
      throw new HttpError(400, 'Troppo tardi per annullare (max 10 minuti)');
    }

    const outcome = await prisma.$transaction(async (tx) => {
      // 1. Prima il check: se rimuovere l'XP causerebbe un level-down, blocca
      //    SENZA toccare la quest (niente da ripristinare, niente finestra di race).
      const char = await tx.character.findUniqueOrThrow({ where: { id: character.id } });
      if (char.xp - quest.xpReward < 0) return { blocked: true as const };

      // 2. Poi il guard anti double-tap
      const undo = await tx.dailyQuest.updateMany({
        where: { id: quest.id, characterId: character.id, completed: true },
        data: { completed: false, completedAt: null },
      });
      if (undo.count !== 1) return { noop: true as const };

      const negativeStats = Object.fromEntries(Object.entries(statRewards).map(([k, v]) => [k, -v]));
      await applyStats(character.id, negativeStats, tx);
      await tx.character.update({
        where: { id: character.id },
        data: { xp: { decrement: quest.xpReward } },
      });
      return { undone: true as const };
    });

    if ('blocked' in outcome) {
      throw new HttpError(400, 'Non puoi annullare: la quest ha già fatto salire di livello');
    }

    const updatedCharacter = await prisma.character.findUniqueOrThrow({ where: { id: character.id } });
    res.json({
      character: { ...updatedCharacter, activeTitle: getDynamicTitle(updatedCharacter) },
      leveledUp: false,
      rankedUp: false,
      newlyUnlocked: { shadows: [], achievements: [] },
      undone: true,
    });
    return;
  }

  // ── COMPLETE ──────────────────────────────────────────────────────────
  const outcome = await prisma.$transaction(async (tx) => {
    const upd = await tx.dailyQuest.updateMany({
      where: { id: quest.id, characterId: character.id, completed: false },
      data: { completed: true, completedAt: new Date() },
    });
    if (upd.count !== 1) return { alreadyDone: true as const };

    await applyStats(character.id, statRewards, tx);
    const { streak, multiplier } = await updateStreak(character.id, today, tx);
    const levelResult = await applyXP(character.id, quest.xpReward, today, tx);
    return { levelResult, streak, multiplier };
  });

  if ('alreadyDone' in outcome) {
    const updatedCharacter = await prisma.character.findUniqueOrThrow({ where: { id: character.id } });
    res.json({
      character: { ...updatedCharacter, activeTitle: getDynamicTitle(updatedCharacter) },
      leveledUp: false,
      rankedUp: false,
      newlyUnlocked: { shadows: [], achievements: [] },
    });
    return;
  }

  const [updatedCharacter, newlyUnlocked] = await Promise.all([
    prisma.character.findUniqueOrThrow({ where: { id: character.id } }),
    runUnlockCheck(character.id),
  ]);

  res.json({
    character: { ...updatedCharacter, activeTitle: getDynamicTitle(updatedCharacter) },
    ...outcome.levelResult,
    newlyUnlocked,
    streak: outcome.streak,
    multiplier: outcome.multiplier,
  });
}));

const FeedbackSchema = z.object({ feedback: z.enum(['easy', 'ok', 'hard']) });

router.post('/daily/:id/feedback', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const parsed = FeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const upd = await prisma.dailyQuest.updateMany({
    where: { id: req.params.id, characterId: character.id, completed: true },
    data: { feedback: parsed.data.feedback },
  });
  if (upd.count !== 1) throw new HttpError(400, 'Feedback possibile solo su quest completate');
  res.status(204).send();
}));

export default router;
