import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../lib/prisma';
import { computeDifficultyHint } from '../routes/quests';
import { resetUsers, makeCharacter } from './helpers';

const user = {
  email: 'quests@example.com',
  password: 'supersecret8',
  characterName: 'QuestHunter',
  weight: 70,
  height: 175,
  age: 30,
  sex: 'male',
  activityLevel: 'moderate',
};

async function setup() {
  await resetUsers();
  const reg = await request(app).post('/v1/auth/register').send(user);
  const token = reg.body.accessToken as string;
  // Senza chiave Groq valida la generazione ricade sui template del seed
  const daily = await request(app).get('/v1/quests/daily').set('Authorization', `Bearer ${token}`);
  return { token, quests: daily.body as { id: string; questTemplate: { xpReward: number } }[] };
}

const xpOf = async (token: string) => {
  const me = await request(app).get('/v1/character/me').set('Authorization', `Bearer ${token}`);
  return me.body.xp as number;
};

beforeEach(async () => {
  await resetUsers();
});

describe('GET /quests/daily', () => {
  it('genera 4 quest (fallback template)', async () => {
    const { quests } = await setup();
    expect(quests.length).toBe(4);
    expect(quests[0].questTemplate.xpReward).toBeGreaterThan(0);
  });
});

describe('POST /quests/daily/:id/complete', () => {
  it('completa e assegna XP una sola volta anche con doppio tap concorrente', async () => {
    const { token, quests } = await setup();
    const q = quests[0];

    const [a, b] = await Promise.all([
      request(app).post(`/v1/quests/daily/${q.id}/complete`).set('Authorization', `Bearer ${token}`),
      request(app).post(`/v1/quests/daily/${q.id}/complete`).set('Authorization', `Bearer ${token}`),
    ]);
    expect([a.status, b.status]).toContain(200);

    // L'endpoint è un toggle: due richieste concorrenti danno (completa,no-op)→reward
    // oppure (completa,annulla)→0, ma MAI il doppio dell'XP.
    const xp = await xpOf(token);
    expect(xp).toBeLessThanOrEqual(q.questTemplate.xpReward);
    expect(xp).not.toBe(q.questTemplate.xpReward * 2);
  });

  it('undo entro 10 minuti riporta l’XP indietro', async () => {
    const { token, quests } = await setup();
    const q = quests[0];

    await request(app).post(`/v1/quests/daily/${q.id}/complete`).set('Authorization', `Bearer ${token}`);
    expect(await xpOf(token)).toBe(q.questTemplate.xpReward);

    const undo = await request(app).post(`/v1/quests/daily/${q.id}/complete`).set('Authorization', `Bearer ${token}`);
    expect(undo.status).toBe(200);
    expect(undo.body.undone).toBe(true);
    expect(await xpOf(token)).toBe(0);
  });

  it('undo bloccato dopo un level-up: 400 e quest ancora completata', async () => {
    const { token, quests } = await setup();
    const q = quests[0];
    const char = await prisma.character.findFirstOrThrow();
    // Portiamo l'XP a ridosso del level-up: completare farà salire di livello
    await prisma.character.update({ where: { id: char.id }, data: { xp: 99 } });

    await request(app).post(`/v1/quests/daily/${q.id}/complete`).set('Authorization', `Bearer ${token}`);
    const afterComplete = await prisma.character.findFirstOrThrow();
    expect(afterComplete.level).toBe(2); // level-up avvenuto

    const undo = await request(app).post(`/v1/quests/daily/${q.id}/complete`).set('Authorization', `Bearer ${token}`);
    expect(undo.status).toBe(400);

    const stillCompleted = await prisma.dailyQuest.findUniqueOrThrow({ where: { id: q.id } });
    expect(stillCompleted.completed).toBe(true); // NON toccata
  });

  it('undo bloccato dopo 10 minuti', async () => {
    const { token, quests } = await setup();
    const q = quests[0];
    await request(app).post(`/v1/quests/daily/${q.id}/complete`).set('Authorization', `Bearer ${token}`);

    // Sposta indietro completedAt di 11 minuti
    await prisma.dailyQuest.update({
      where: { id: q.id },
      data: { completedAt: new Date(Date.now() - 11 * 60 * 1000) },
    });

    const res = await request(app).post(`/v1/quests/daily/${q.id}/complete`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('POST /quests/daily/:id/feedback', () => {
  it('feedback su quest NON completata → 400', async () => {
    const { token, quests } = await setup();
    const res = await request(app)
      .post(`/v1/quests/daily/${quests[0].id}/feedback`)
      .set('Authorization', `Bearer ${token}`)
      .send({ feedback: 'hard' });
    expect(res.status).toBe(400);
  });

  it('feedback su quest completata → 204', async () => {
    const { token, quests } = await setup();
    const q = quests[0];
    await request(app).post(`/v1/quests/daily/${q.id}/complete`).set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .post(`/v1/quests/daily/${q.id}/feedback`)
      .set('Authorization', `Bearer ${token}`)
      .send({ feedback: 'ok' });
    expect(res.status).toBe(204);
  });
});

describe('Quest di Ritorno (recovery)', () => {
  async function recoverySetup() {
    const reg = await request(app).post('/v1/auth/register').send(user);
    const token = reg.body.accessToken as string;
    const character = await prisma.character.findFirstOrThrow();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const quest = await prisma.dailyQuest.create({
      data: {
        characterId: character.id, date: today,
        title: 'Ritorno', description: 'd', category: 'fitness',
        xpReward: 20, statRewards: { vit: 1 }, difficulty: 1,
        isRecovery: true, recoveryBonusXp: 30,
      },
    });
    return { token, characterId: character.id, quest };
  }

  it('completamento → streak 3 e XP = reward + bonus', async () => {
    const { token, characterId, quest } = await recoverySetup();
    await request(app).post(`/v1/quests/daily/${quest.id}/complete`).set('Authorization', `Bearer ${token}`);
    const char = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
    expect(char.streak).toBe(3);
    expect(char.xp).toBe(20 + 30);
  });

  it('undo su recovery → 400', async () => {
    const { token, quest } = await recoverySetup();
    await request(app).post(`/v1/quests/daily/${quest.id}/complete`).set('Authorization', `Bearer ${token}`);
    const undo = await request(app).post(`/v1/quests/daily/${quest.id}/complete`).set('Authorization', `Bearer ${token}`);
    expect(undo.status).toBe(400);
  });
});

describe('computeDifficultyHint', () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  async function seedFeedback(characterId: string, feedbacks: ('easy' | 'ok' | 'hard')[]) {
    for (const fb of feedbacks) {
      await prisma.dailyQuest.create({
        data: {
          characterId, date: yesterday, title: 't', description: 'd',
          category: 'fitness', xpReward: 10, statRewards: {}, difficulty: 1,
          completed: true, feedback: fb,
        },
      });
    }
  }

  it('2 hard (> easy) → easier', async () => {
    const c = await makeCharacter();
    await seedFeedback(c.id, ['hard', 'hard', 'ok']);
    expect(await computeDifficultyHint(c.id, today)).toBe('easier');
  });

  it('3 easy (> hard) → harder', async () => {
    const c = await makeCharacter();
    await seedFeedback(c.id, ['easy', 'easy', 'easy']);
    expect(await computeDifficultyHint(c.id, today)).toBe('harder');
  });

  it('misto bilanciato → null', async () => {
    const c = await makeCharacter();
    await seedFeedback(c.id, ['hard', 'hard', 'easy', 'easy']);
    expect(await computeDifficultyHint(c.id, today)).toBeNull();
  });
});
