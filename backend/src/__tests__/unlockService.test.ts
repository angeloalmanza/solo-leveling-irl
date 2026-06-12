import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { evalCondition } from '../services/unlockService';
import { resetUsers, makeCharacter } from './helpers';

beforeEach(async () => {
  await resetUsers();
});

describe('evalCondition — un caso per tipo', () => {
  it('level_X', async () => {
    const c = await makeCharacter({ level: 10 });
    expect(await evalCondition('level_10', c.id)).toBe(true);
    expect(await evalCondition('level_11', c.id)).toBe(false);
  });

  it('rank_X (in base al livello)', async () => {
    const c = await makeCharacter({ level: 10 }); // rank D di default? no: rank è campo separato
    await prisma.character.update({ where: { id: c.id }, data: { rank: 'C' } });
    expect(await evalCondition('rank_D', c.id)).toBe(true); // C >= D
    expect(await evalCondition('rank_B', c.id)).toBe(false);
  });

  it('str_X', async () => {
    const c = await makeCharacter({ str: 50 });
    expect(await evalCondition('str_50', c.id)).toBe(true);
    expect(await evalCondition('str_51', c.id)).toBe(false);
  });

  it('all_stats_50', async () => {
    const c = await makeCharacter();
    await prisma.character.update({
      where: { id: c.id },
      data: { str: 50, agi: 50, int: 50, vit: 50, end: 50 },
    });
    expect(await evalCondition('all_stats_50', c.id)).toBe(true);
  });

  it('total_quests_N (quest completate)', async () => {
    const c = await makeCharacter();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      await prisma.dailyQuest.create({
        data: {
          characterId: c.id,
          date: today,
          title: `Q${i}`,
          description: 'd',
          category: 'fitness',
          xpReward: 10,
          statRewards: {},
          difficulty: 1,
          completed: true,
        },
      });
    }
    expect(await evalCondition('total_quests_3', c.id)).toBe(true);
    expect(await evalCondition('total_quests_4', c.id)).toBe(false);
  });

  it('condizione sconosciuta → false', async () => {
    const c = await makeCharacter();
    expect(await evalCondition('boh_qualcosa', c.id)).toBe(false);
  });
});
