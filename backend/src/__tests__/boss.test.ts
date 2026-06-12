import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../lib/prisma';
import { weekStartFor } from '../lib/dates';
import { resetUsers } from './helpers';

const user = {
  email: 'boss@example.com',
  password: 'supersecret8',
  characterName: 'BossHunter',
  weight: 70,
  height: 175,
  age: 30,
  sex: 'male',
  activityLevel: 'moderate',
};

beforeEach(async () => {
  await resetUsers();
});

async function setupDefeatableBoss() {
  const reg = await request(app).post('/v1/auth/register').send(user);
  const token = reg.body.accessToken as string;
  const character = await prisma.character.findFirstOrThrow();

  // Boss creato direttamente (la generazione AI non è disponibile nei test)
  const boss = await prisma.weeklyBoss.create({
    data: {
      characterId: character.id,
      weekStart: weekStartFor('Europe/Rome'),
      name: 'Test Boss',
      description: 'd',
      lore: 'l',
      xpReward: 50,
      statRewards: { str: 2 },
      difficulty: 3,
      tasks: {
        create: [
          { title: 'T1', description: 'd', completed: true },
          { title: 'T2', description: 'd', completed: true },
          { title: 'T3', description: 'd', completed: true },
        ],
      },
    },
  });
  return { token, characterId: character.id, boss };
}

describe('POST /v1/boss/weekly/defeat', () => {
  it('due defeat concorrenti → uno 200 e uno 400, XP assegnato una sola volta', async () => {
    const { token, characterId, boss } = await setupDefeatableBoss();

    const [a, b] = await Promise.all([
      request(app).post('/v1/boss/weekly/defeat').set('Authorization', `Bearer ${token}`),
      request(app).post('/v1/boss/weekly/defeat').set('Authorization', `Bearer ${token}`),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 400]);

    const char = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
    expect(char.xp).toBe(boss.xpReward); // una sola volta, non il doppio
  });
});
