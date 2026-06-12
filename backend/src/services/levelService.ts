import { Prisma, Rank } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { todayFor, DEFAULT_TZ } from '../lib/dates';
import { calcRank as sharedCalcRank, streakMultiplier as sharedStreakMultiplier, xpForNextLevel } from '@solo/shared';

/** Client Prisma o transazione interattiva. */
type Db = Prisma.TransactionClient | typeof prisma;

// Re-export dalle formule condivise (unica fonte di verità con il mobile)
export const calcRank = (level: number): Rank => sharedCalcRank(level) as Rank;
export const calcStreakMultiplier = sharedStreakMultiplier;

export function getDynamicTitle(char: { str: number; agi: number; int: number; end: number; vit: number; activeTitle: string | null }): string {
  if (char.activeTitle) return char.activeTitle;
  const stats = { str: char.str, agi: char.agi, int: char.int, end: char.end, vit: char.vit };
  const maxVal = Math.max(...Object.values(stats));
  const dominant = Object.entries(stats).find(([, v]) => v === maxVal)?.[0];
  const titles: Record<string, string> = {
    str: "Corpo d'Acciaio",
    agi: 'Ombra Veloce',
    int: 'Mente Affilata',
    end: 'Indistruttibile',
    vit: 'Corpo Nutrito',
  };
  return titles[dominant ?? ''] ?? 'Cacciatore Equilibrato';
}

export interface LevelUpResult {
  leveledUp: boolean;
  rankedUp: boolean;
  oldLevel: number;
  newLevel: number;
  oldRank: Rank;
  newRank: Rank;
}

export async function saveSnapshotIfNeeded(characterId: string, today: Date, db: Db = prisma): Promise<void> {
  const existing = await db.statSnapshot.findUnique({
    where: { characterId_date: { characterId, date: today } },
  });
  if (existing) return;
  const char = await db.character.findUniqueOrThrow({ where: { id: characterId } });
  await db.statSnapshot.create({
    data: { characterId, date: today, str: char.str, agi: char.agi, int: char.int, end: char.end, vit: char.vit, level: char.level },
  });
}

export async function applyXP(characterId: string, baseXp: number, today: Date, db: Db = prisma): Promise<LevelUpResult> {
  const char = await db.character.findUniqueOrThrow({ where: { id: characterId } });

  const oldLevel = char.level;
  const oldRank = char.rank;

  // baseXp è l'XP finale già calcolato dal chiamante (incluso l'eventuale
  // moltiplicatore di streak). Qui lo aggiungiamo grezzo.
  const xpGain = Math.round(baseXp);

  let level = char.level;
  let xp = char.xp + xpGain;

  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level);
    level++;
  }

  const newRank = calcRank(level);

  await db.character.update({
    where: { id: characterId },
    data: { level, xp, rank: newRank },
  });

  if (level > oldLevel) {
    await saveSnapshotIfNeeded(characterId, today, db);
  }

  return {
    leveledUp: level > oldLevel,
    rankedUp: newRank !== oldRank,
    oldLevel,
    newLevel: level,
    oldRank,
    newRank,
  };
}

export async function applyStats(characterId: string, rewards: Record<string, number>, db: Db = prisma) {
  const update: Record<string, { increment: number }> = {};
  for (const [stat, val] of Object.entries(rewards)) {
    if (['str', 'agi', 'int', 'vit', 'end'].includes(stat) && val !== 0) {
      update[stat] = { increment: val };
    }
  }
  if (Object.keys(update).length > 0) {
    await db.character.update({ where: { id: characterId }, data: update });
  }
}

export interface PenaltyResult {
  penaltyApplied: boolean;
  daysLost: number;
  xpLost: number;
  levelDown: boolean;
  rankDown: boolean;
  oldLevel: number;
  newLevel: number;
  oldRank: Rank;
  newRank: Rank;
}

/**
 * Penalità inattività idempotente: applicata al massimo una volta per giorno
 * e mai due volte per lo stesso intervallo (baseline = max(lastQuest, lastPenalty)).
 */
export async function applyInactivityPenalty(characterId: string, tz: string = DEFAULT_TZ): Promise<PenaltyResult | null> {
  const today = todayFor(tz);

  return prisma.$transaction(async (tx) => {
    const char = await tx.character.findUniqueOrThrow({ where: { id: characterId } });
    if (!char.lastQuestDate) return null;

    // Già penalizzato oggi → idempotente
    if (char.lastPenaltyDate && new Date(char.lastPenaltyDate).getTime() >= today.getTime()) {
      return null;
    }

    // Baseline: il più recente fra ultima quest e ultima penalità (no doppio conteggio)
    const lastQuest = new Date(char.lastQuestDate);
    lastQuest.setUTCHours(0, 0, 0, 0);
    let baseline = lastQuest;
    if (char.lastPenaltyDate) {
      const lp = new Date(char.lastPenaltyDate);
      lp.setUTCHours(0, 0, 0, 0);
      if (lp > baseline) baseline = lp;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysDiff = Math.floor((today.getTime() - baseline.getTime()) / msPerDay);
    if (daysDiff <= 1) return null;

    const daysLost = Math.min(daysDiff - 1, 7);
    const xpPerDay = char.level * 5;
    const totalPenalty = xpPerDay * daysLost;

    const oldLevel = char.level;
    const oldRank = char.rank;

    let level = char.level;
    let xp = char.xp - totalPenalty;
    while (xp < 0 && level > 1) {
      level--;
      xp = xpForNextLevel(level) + xp;
    }
    xp = Math.max(0, xp);

    const newRank = calcRank(level);

    await tx.character.update({
      where: { id: characterId },
      data: { level, xp, rank: newRank, streak: 0, lastPenaltyDate: today },
    });

    return {
      penaltyApplied: true,
      daysLost,
      xpLost: totalPenalty,
      levelDown: level < oldLevel,
      rankDown: newRank !== oldRank,
      oldLevel,
      newLevel: level,
      oldRank,
      newRank,
    };
  });
}

export async function updateStreak(characterId: string, today: Date, db: Db = prisma): Promise<{ streak: number; multiplier: number }> {
  const char = await db.character.findUniqueOrThrow({ where: { id: characterId } });

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const lastDate = char.lastQuestDate ? new Date(char.lastQuestDate) : null;
  if (lastDate) lastDate.setUTCHours(0, 0, 0, 0);

  let newStreak = char.streak;

  if (!lastDate || lastDate < yesterday) {
    newStreak = 1;
  } else if (lastDate.getTime() === yesterday.getTime()) {
    newStreak = char.streak + 1;
  }
  // Se lastDate === today, la streak non cambia (già aggiornata oggi)

  const bestStreak = Math.max(newStreak, char.bestStreak);

  await db.character.update({
    where: { id: characterId },
    data: { streak: newStreak, bestStreak, lastQuestDate: today },
  });

  return { streak: newStreak, multiplier: calcStreakMultiplier(newStreak) };
}
