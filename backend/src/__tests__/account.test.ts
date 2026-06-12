import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../lib/prisma';
import { resetUsers } from './helpers';

const user = {
  email: 'account@example.com',
  password: 'supersecret8',
  characterName: 'AccHunter',
  weight: 70,
  height: 175,
  age: 30,
  sex: 'male',
  activityLevel: 'moderate',
};

beforeEach(async () => {
  await resetUsers();
});

async function registerAndSeed() {
  const reg = await request(app).post('/v1/auth/register').send(user);
  const token = reg.body.accessToken as string;
  const character = await prisma.character.findFirstOrThrow();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  // Un po' di dati figli per verificare il cascade
  await prisma.dailyQuest.create({
    data: {
      characterId: character.id, date: today, title: 't', description: 'd',
      category: 'fitness', xpReward: 10, statRewards: {}, difficulty: 1,
    },
  });
  return { token, characterId: character.id };
}

describe('DELETE /v1/account', () => {
  it('password errata → 401 e utente ancora presente', async () => {
    const { token } = await registerAndSeed();
    const res = await request(app).delete('/v1/account').set('Authorization', `Bearer ${token}`).send({ password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(await prisma.user.count()).toBe(1);
  });

  it('password corretta → 204 e nessun dato orfano', async () => {
    const { token, characterId } = await registerAndSeed();
    const res = await request(app).delete('/v1/account').set('Authorization', `Bearer ${token}`).send({ password: user.password });
    expect(res.status).toBe(204);

    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.character.count()).toBe(0);
    expect(await prisma.userProfile.count()).toBe(0);
    expect(await prisma.dailyQuest.count({ where: { characterId } })).toBe(0);
    expect(await prisma.refreshToken.count()).toBe(0);
  });
});

describe('GET /v1/account/export', () => {
  it('restituisce un JSON con user, profile e character', async () => {
    const { token } = await registerAndSeed();
    const res = await request(app).get('/v1/account/export').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.profile).toBeTruthy();
    expect(res.body.character.dailyQuests.length).toBeGreaterThanOrEqual(1);
  });
});
