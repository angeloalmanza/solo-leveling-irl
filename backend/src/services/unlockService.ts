import { Character, Rank } from '@prisma/client';
import { prisma } from '../lib/prisma';

const RANK_ORDER: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const rankIndex = (r: Rank) => RANK_ORDER.indexOf(r);

export interface UnlockContext {
  char: Character;
  totalQuests: number;
  fitnessQuests: number;
  shadowsUnlocked: number;
  shadowsTotal: number;
}

/** Carica una sola volta tutto il contesto necessario alle condizioni. */
export async function buildContext(characterId: string): Promise<UnlockContext> {
  const [char, totalQuests, fitnessQuests, shadowsUnlocked, shadowsTotal] = await Promise.all([
    prisma.character.findUniqueOrThrow({ where: { id: characterId } }),
    prisma.dailyQuest.count({ where: { characterId, completed: true } }),
    prisma.dailyQuest.count({ where: { characterId, completed: true, category: 'fitness' } }),
    prisma.unlockedShadow.count({ where: { characterId } }),
    prisma.shadow.count(),
  ]);
  return { char, totalQuests, fitnessQuests, shadowsUnlocked, shadowsTotal };
}

/** Valuta una condizione di sblocco contro il contesto precaricato (sincrono). */
export function evalCondition(condition: string, ctx: UnlockContext): boolean {
  const { char } = ctx;

  if (condition.startsWith('rank_')) {
    const target = condition.split('_')[1] as Rank;
    return rankIndex(char.rank) >= rankIndex(target);
  }
  if (condition.startsWith('level_')) return char.level >= parseInt(condition.split('_')[1]);
  if (condition.startsWith('str_')) return char.str >= parseInt(condition.split('_')[1]);
  if (condition.startsWith('agi_')) return char.agi >= parseInt(condition.split('_')[1]);
  if (condition.startsWith('int_')) return char.int >= parseInt(condition.split('_')[1]);
  if (condition.startsWith('vit_')) return char.vit >= parseInt(condition.split('_')[1]);
  if (condition.startsWith('end_')) return char.end >= parseInt(condition.split('_')[1]);
  if (condition === 'all_stats_50') {
    return char.str >= 50 && char.agi >= 50 && char.int >= 50 && char.vit >= 50 && char.end >= 50;
  }
  if (condition.startsWith('fitness_quests_')) return ctx.fitnessQuests >= parseInt(condition.split('_')[2]);
  if (condition.startsWith('total_quests_')) return ctx.totalQuests >= parseInt(condition.split('_')[2]);
  if (condition.startsWith('shadows_')) return ctx.shadowsUnlocked >= parseInt(condition.split('_')[1]);
  if (condition === 'all_shadows') return ctx.shadowsUnlocked >= ctx.shadowsTotal;
  return false;
}

export interface NewlyUnlocked {
  shadows: { id: string; name: string; rank: string; description: string }[];
  achievements: { id: string; name: string; titleReward: string; description: string }[];
}

export async function runUnlockCheck(characterId: string): Promise<NewlyUnlocked> {
  const result: NewlyUnlocked = { shadows: [], achievements: [] };
  const ctx = await buildContext(characterId);

  const [alreadyShadows, alreadyAch, shadows, achievements] = await Promise.all([
    prisma.unlockedShadow.findMany({ where: { characterId }, select: { shadowId: true } }),
    prisma.unlockedAchievement.findMany({ where: { characterId }, select: { achievementId: true } }),
    prisma.shadow.findMany(),
    prisma.achievement.findMany(),
  ]);
  const unlockedShadowIds = new Set(alreadyShadows.map((u) => u.shadowId));
  const unlockedAchIds = new Set(alreadyAch.map((u) => u.achievementId));

  for (const shadow of shadows) {
    if (unlockedShadowIds.has(shadow.id)) continue;
    if (evalCondition(shadow.unlockCondition, ctx)) {
      await prisma.unlockedShadow.create({ data: { characterId, shadowId: shadow.id } });
      result.shadows.push({ id: shadow.id, name: shadow.name, rank: shadow.rank, description: shadow.description });
    }
  }

  for (const ach of achievements) {
    if (unlockedAchIds.has(ach.id)) continue;
    if (evalCondition(ach.condition, ctx)) {
      await prisma.unlockedAchievement.create({ data: { characterId, achievementId: ach.id } });
      result.achievements.push({ id: ach.id, name: ach.name, titleReward: ach.titleReward, description: ach.description });
    }
  }

  return result;
}
