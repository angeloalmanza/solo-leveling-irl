import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './index';

describe('app smoke', () => {
  it('GET /health → 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('route sconosciuta → 404 JSON', async () => {
    const res = await request(app).get('/rotta-inesistente');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('endpoint protetto senza token → 401 JSON', async () => {
    const res = await request(app).get('/character/me');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});
