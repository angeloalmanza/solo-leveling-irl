import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { resetUsers } from './helpers';

const user = {
  email: 'goals@example.com',
  password: 'supersecret8',
  characterName: 'GoalHunter',
  weight: 70,
  height: 175,
  age: 30,
  sex: 'male',
  activityLevel: 'moderate',
};

async function token() {
  const reg = await request(app).post('/v1/auth/register').send(user);
  return reg.body.accessToken as string;
}

beforeEach(async () => {
  await resetUsers();
});

describe('PATCH /v1/character/goals', () => {
  it('valida e persiste fino a 3 obiettivi', async () => {
    const t = await token();
    const res = await request(app)
      .patch('/v1/character/goals')
      .set('Authorization', `Bearer ${t}`)
      .send({ goals: ['Correre 5km', 'Leggere ogni giorno'] });
    expect(res.status).toBe(200);
    expect(res.body.goals).toEqual(['Correre 5km', 'Leggere ogni giorno']);

    const get = await request(app).get('/v1/character/goals').set('Authorization', `Bearer ${t}`);
    expect(get.body.goals).toEqual(['Correre 5km', 'Leggere ogni giorno']);
  });

  it('rifiuta più di 3 obiettivi', async () => {
    const t = await token();
    const res = await request(app)
      .patch('/v1/character/goals')
      .set('Authorization', `Bearer ${t}`)
      .send({ goals: ['a', 'b', 'c', 'd'] });
    expect(res.status).toBe(400);
  });

  it('rifiuta obiettivi troppo lunghi (>100 char)', async () => {
    const t = await token();
    const res = await request(app)
      .patch('/v1/character/goals')
      .set('Authorization', `Bearer ${t}`)
      .send({ goals: ['x'.repeat(101)] });
    expect(res.status).toBe(400);
  });
});
