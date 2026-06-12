import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { resetUsers } from './helpers';

const validUser = {
  email: 'auth@example.com',
  password: 'supersecret8',
  characterName: 'AuthHunter',
  weight: 70,
  height: 175,
  age: 30,
  sex: 'male',
  activityLevel: 'moderate',
};

beforeEach(async () => {
  await resetUsers();
});

describe('POST /auth/register', () => {
  it('registra e restituisce i token', async () => {
    const res = await request(app).post('/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it('rifiuta email duplicata con 409', async () => {
    await request(app).post('/auth/register').send(validUser);
    const res = await request(app).post('/auth/register').send(validUser);
    expect(res.status).toBe(409);
  });

  it('rifiuta password troppo corta con 400', async () => {
    const res = await request(app).post('/auth/register').send({ ...validUser, password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/register').send(validUser);
  });

  it('login corretto → 200 con token', async () => {
    const res = await request(app).post('/auth/login').send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('password errata → 401', async () => {
    const res = await request(app).post('/auth/login').send({ email: validUser.email, password: 'wrongpass8' });
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh — rotazione e revoca', () => {
  it('ruota i token e rifiuta il riuso del vecchio', async () => {
    const reg = await request(app).post('/auth/register').send(validUser);
    const oldRefresh = reg.body.refreshToken;

    const r1 = await request(app).post('/auth/refresh').send({ refreshToken: oldRefresh });
    expect(r1.status).toBe(200);
    expect(r1.body.accessToken).toBeTruthy();
    expect(r1.body.refreshToken).toBeTruthy();
    expect(r1.body.refreshToken).not.toBe(oldRefresh);

    // Il token nuovo funziona
    const r2 = await request(app).post('/auth/refresh').send({ refreshToken: r1.body.refreshToken });
    expect(r2.status).toBe(200);

    // Riuso del vecchio (revocato) → 401
    const reuse = await request(app).post('/auth/refresh').send({ refreshToken: oldRefresh });
    expect(reuse.status).toBe(401);
  });

  it('dopo logout il refresh fallisce', async () => {
    const reg = await request(app).post('/auth/register').send(validUser);
    const rt = reg.body.refreshToken;
    const out = await request(app).post('/auth/logout').send({ refreshToken: rt });
    expect(out.status).toBe(204);
    const res = await request(app).post('/auth/refresh').send({ refreshToken: rt });
    expect(res.status).toBe(401);
  });
});
