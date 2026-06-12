import { Rank } from '@prisma/client';
import { prisma } from '../lib/prisma';

const RANK_ORDER: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const rankIndex = (r: Rank) => RANK_ORDER.indexOf(r);

export async function evalCondition(condition: string, characterId: string): Promise<boolean> {
  const char = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });

  if (condition.startsWith('rank_')) {
    const target = condition.split('_')[1] as Rank;
    return rankIndex(char.rank) >= rankIndex(target);
  }
  if (condition.startsWith('level_')) {
    return char.level >= parseInt(condition.split('_')[1]);
  }
  if (condition.startsWith('str_')) return char.str >= parseInt(condition.split('_')[1]);
  if (condition.startsWith('agi_')) return char.agi >= parseInt(condition.split('_')[1]);
  if (condition.startsWith('int_')) return char.int >= parseInt(condition.split('_')[1]);
  if (condition.startsWith('vit_')) return char.vit >= parseInt(condition.split('_')[1]);
  if (condition.startsWith('end_')) return char.end >= parseInt(condition.split('_')[1]);
  if (condition === 'all_stats_50') {
    return char.str >= 50 && char.agi >= 50 && char.int >= 50 && char.vit >= 50 && char.end >= 50;
  }
  if (condition.startsWith('fitness_quests_')) {
    const n = parseInt(condition.split('_')[2]);
    const count = await prisma.dailyQuest.count({
      where: { characterId, completed: true, questTemplate: { category: 'fitness' } },
    });
    return count >= n;
  }
  if (condition.startsWith('total_quests_')) {
    const n = parseInt(condition.split('_')[2]);
    const count = await prisma.dailyQuest.count({ where: { characterId, completed: true } });
    return count >= n;
  }
  if (condition.startsWith('shadows_')) {
    const n = parseInt(condition.split('_')[1]);
    const count = await prisma.unlockedShadow.count({ where: { characterId } });
    return count >= n;
  }
  if (condition === 'all_shadows') {
    const total = await prisma.shadow.count();
    const unlocked = await prisma.unlockedShadow.count({ where: { characterId } });
    return unlocked >= total;
  }
  return false;
}

export interface NewlyUnlocked {
  shadows: { id: string; name: string; rank: string; description: string }[];
  achievements: { id: string; name: string; titleReward: string; description: string }[];
}

export async function runUnlockCheck(characterId: string): Promise<NewlyUnlocked> {
  const result: NewlyUnlocked = { shadows: [], achievements: [] };

  const alreadyUnlockedShadows = await prisma.unlockedShadow.findMany({
    where: { characterId },
    select: { shadowId: true },
  });
  const unlockedShadowIds = new Set(alreadyUnlockedShadows.map((u) => u.shadowId));

  const shadows = await prisma.shadow.findMany();
  for (const shadow of shadows) {
    if (unlockedShadowIds.has(shadow.id)) continue;
    if (await evalCondition(shadow.unlockCondition, characterId)) {
      await prisma.unlockedShadow.create({ data: { characterId, shadowId: shadow.id } });
      result.shadows.push({ id: shadow.id, name: shadow.name, rank: shadow.rank, description: shadow.description });
    }
  }

  const alreadyUnlockedAch = await prisma.unlockedAchievement.findMany({
    where: { characterId },
    select: { achievementId: true },
  });
  const unlockedAchIds = new Set(alreadyUnlockedAch.map((u) => u.achievementId));

  const achievements = await prisma.achievement.findMany();
  for (const ach of achievements) {
    if (unlockedAchIds.has(ach.id)) continue;
    if (await evalCondition(ach.condition, characterId)) {
      await prisma.unlockedAchievement.create({ data: { characterId, achievementId: ach.id } });
      result.achievements.push({ id: ach.id, name: ach.name, titleReward: ach.titleReward, description: ach.description });
    }
  }

  return result;
}
