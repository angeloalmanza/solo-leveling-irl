import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { evalCondition, buildContext } from '../services/unlockService';
import { resetUsers, makeCharacter } from './helpers';

beforeEach(async () => {
  await resetUsers();
});

describe('evalCondition — un caso per tipo (contesto precaricato)', () => {
  it('level_X', async () => {
    const c = await makeCharacter({ level: 10 });
    const ctx = await buildContext(c.id);
    expect(evalCondition('level_10', ctx)).toBe(true);
    expect(evalCondition('level_11', ctx)).toBe(false);
  });

  it('rank_X (in base al rank)', async () => {
    const c = await makeCharacter({ level: 10 });
    await prisma.character.update({ where: { id: c.id }, data: { rank: 'C' } });
    const ctx = await buildContext(c.id);
    expect(evalCondition('rank_D', ctx)).toBe(true); // C >= D
    expect(evalCondition('rank_B', ctx)).toBe(false);
  });

  it('str_X', async () => {
    const c = await makeCharacter({ str: 50 });
    const ctx = await buildContext(c.id);
    expect(evalCondition('str_50', ctx)).toBe(true);
    expect(evalCondition('str_51', ctx)).toBe(false);
  });

  it('all_stats_50', async () => {
    const c = await makeCharacter();
    await prisma.character.update({
      where: { id: c.id },
      data: { str: 50, agi: 50, int: 50, vit: 50, end: 50 },
    });
    const ctx = await buildContext(c.id);
    expect(evalCondition('all_stats_50', ctx)).toBe(true);
  });

  it('total_quests_N e fitness_quests_N (denormalizzati su DailyQuest)', async () => {
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
          category: i === 0 ? 'mente' : 'fitness',
          xpReward: 10,
          statRewards: {},
          difficulty: 1,
          completed: true,
        },
      });
    }
    const ctx = await buildContext(c.id);
    expect(evalCondition('total_quests_3', ctx)).toBe(true);
    expect(evalCondition('total_quests_4', ctx)).toBe(false);
    expect(evalCondition('fitness_quests_2', ctx)).toBe(true);
    expect(evalCondition('fitness_quests_3', ctx)).toBe(false);
  });

  it('condizione sconosciuta → false', async () => {
    const c = await makeCharacter();
    const ctx = await buildContext(c.id);
    expect(evalCondition('boh_qualcosa', ctx)).toBe(false);
  });
});
