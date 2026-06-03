import { Rank } from '@prisma/client';
import { prisma } from '../lib/prisma';

export function calcRank(level: number): Rank {
  if (level >= 100) return 'S';
  if (level >= 75) return 'A';
  if (level >= 50) return 'B';
  if (level >= 25) return 'C';
  if (level >= 10) return 'D';
  return 'E';
}

export interface LevelUpResult {
  leveledUp: boolean;
  rankedUp: boolean;
  oldLevel: number;
  newLevel: number;
  oldRank: Rank;
  newRank: Rank;
}

export async function applyXP(characterId: string, xpGain: number): Promise<LevelUpResult> {
  const char = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });

  const oldLevel = char.level;
  const oldRank = char.rank;

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

export async function applyStats(
  characterId: string,
  rewards: Record<string, number>
) {
  const update: Record<string, { increment: number }> = {};
  for (const [stat, val] of Object.entries(rewards)) {
    if (['str', 'agi', 'int', 'vit', 'end'].includes(stat) && val > 0) {
      update[stat] = { increment: val };
    }
  }
  if (Object.keys(update).length > 0) {
    await prisma.character.update({ where: { id: characterId }, data: update });
  }
}
