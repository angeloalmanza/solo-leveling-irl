import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../lib/prisma';
import { resetUsers } from './helpers';

function userPayload(email: string) {
  return {
    email,
    password: 'supersecret8',
    characterName: 'SkillHunter',
    weight: 70,
    height: 175,
    age: 30,
    sex: 'male',
    activityLevel: 'moderate',
  };
}

async function registerUser(email: string) {
  const reg = await request(app).post('/auth/register').send(userPayload(email));
  const character = await prisma.character.findFirstOrThrow({ where: { user: { email } } });
  return { token: reg.body.accessToken as string, characterId: character.id };
}

beforeEach(async () => {
  await resetUsers();
});

describe('POST /skills/:id/unlock', () => {
  it('blocca lo sblocco se il livello è insufficiente', async () => {
    const { token, characterId } = await registerUser('skill1@example.com');
    const skill = await prisma.skill.create({
      data: { characterId, name: 'Potenza', description: 'd', type: 'passive', unlockLevel: 50, statBonus: { str: 2 } },
    });
    const res = await request(app).post(`/skills/${skill.id}/unlock`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('richiede che il genitore sia sbloccato', async () => {
    const { token, characterId } = await registerUser('skill2@example.com');
    const parent = await prisma.skill.create({
      data: { characterId, name: 'Base', description: 'd', type: 'passive', unlockLevel: 1, statBonus: { str: 1 } },
    });
    const child = await prisma.skill.create({
      data: { characterId, name: 'Avanzata', description: 'd', type: 'passive', unlockLevel: 1, statBonus: { str: 1 }, parentSkillId: parent.id },
    });

    // Figlio prima del genitore → 400
    const fail = await request(app).post(`/skills/${child.id}/unlock`).set('Authorization', `Bearer ${token}`);
    expect(fail.status).toBe(400);

    // Sblocca genitore, poi figlio → 200
    const ok1 = await request(app).post(`/skills/${parent.id}/unlock`).set('Authorization', `Bearer ${token}`);
    expect(ok1.status).toBe(200);
    const ok2 = await request(app).post(`/skills/${child.id}/unlock`).set('Authorization', `Bearer ${token}`);
    expect(ok2.status).toBe(200);
  });

  it('un utente non può sbloccare la skill di un altro (isolamento)', async () => {
    const a = await registerUser('skillA@example.com');
    const b = await registerUser('skillB@example.com');
    const skillA = await prisma.skill.create({
      data: { characterId: a.characterId, name: 'SoloMia', description: 'd', type: 'passive', unlockLevel: 1, statBonus: { str: 1 } },
    });
    const res = await request(app).post(`/skills/${skillA.id}/unlock`).set('Authorization', `Bearer ${b.token}`);
    expect(res.status).toBe(403);
  });
});
