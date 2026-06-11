import { Rank } from '@prisma/client';
import { prisma } from '../lib/prisma';

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

export function calcRank(level: number): Rank {
  if (level >= 100) return 'S';
  if (level >= 75) return 'A';
  if (level >= 50) return 'B';
  if (level >= 25) return 'C';
  if (level >= 10) return 'D';
  return 'E';
}

export function calcStreakMultiplier(streak: number): number {
  if (streak >= 30) return 1.5;
  if (streak >= 14) return 1.25;
  if (streak >= 7) return 1.1;
  return 1.0;
}

export interface LevelUpResult {
  leveledUp: boolean;
  rankedUp: boolean;
  oldLevel: number;
  newLevel: number;
  oldRank: Rank;
  newRank: Rank;
}

export async function applyXP(characterId: string, baseXp: number): Promise<LevelUpResult> {
  const char = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });

  const oldLevel = char.level;
  const oldRank = char.rank;

  const multiplier = calcStreakMultiplier(char.streak);
  const xpGain = Math.round(baseXp * multiplier);

  let level = char.level;
  let xp = char.xp + xpGain;

  while (xp >= level * 100) {
    xp -= level * 100;
    level++;
  }

  const newRank = calcRank(level);

  await prisma.character.update({
    where: { id: characterId },
    data: { level, xp, rank: newRank },
  });

  return {
    leveledUp: level > oldLevel,
    rankedUp: newRank !== oldRank,
    oldLevel,
    newLevel: level,
    oldRank,
    newRank,
  };
}

export async function applyStats(characterId: string, rewards: Record<string, number>) {
  const update: Record<string, { increment: number }> = {};
  for (const [stat, val] of Object.entries(rewards)) {
    if (['str', 'agi', 'int', 'vit', 'end'].includes(stat) && val !== 0) {
      update[stat] = { increment: val };
    }
  }
  if (Object.keys(update).length > 0) {
    await prisma.character.update({ where: { id: characterId }, data: update });
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

export async function applyInactivityPenalty(characterId: string): Promise<PenaltyResult | null> {
  const char = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });

  if (!char.lastQuestDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = new Date(char.lastQuestDate);
  lastDate.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / msPerDay);

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
    xp = level * 100 + xp;
  }
  xp = Math.max(0, xp);

  const newRank = calcRank(level);

  await prisma.character.update({
    where: { id: characterId },
    data: { level, xp, rank: newRank, streak: 0 },
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
}

export async function updateStreak(characterId: string): Promise<{ streak: number; multiplier: number }> {
  const char = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastDate = char.lastQuestDate ? new Date(char.lastQuestDate) : null;
  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  let newStreak = char.streak;

  if (!lastDate || lastDate < yesterday) {
    newStreak = 1;
  } else if (lastDate.getTime() === yesterday.getTime()) {
    newStreak = char.streak + 1;
  }
  // Se lastDate === today, la streak non cambia (già aggiornata oggi)

  const bestStreak = Math.max(newStreak, char.bestStreak);

  await prisma.character.update({
    where: { id: characterId },
    data: { streak: newStreak, bestStreak, lastQuestDate: today },
  });

  return { streak: newStreak, multiplier: calcStreakMultiplier(newStreak) };
}
