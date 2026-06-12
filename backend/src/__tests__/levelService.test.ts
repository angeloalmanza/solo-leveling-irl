import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { applyXP, updateStreak, applyInactivityPenalty } from '../services/levelService';
import { todayFor } from '../lib/dates';
import { resetUsers, makeCharacter } from './helpers';

const TODAY = todayFor('UTC');
const daysAgo = (n: number) => {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

beforeEach(async () => {
  await resetUsers();
});

describe('applyXP', () => {
  it('gestisce level-up multipli', async () => {
    const c = await makeCharacter({ level: 1, xp: 0, streak: 0 });
    const r = await applyXP(c.id, 250, TODAY); // L1 costa 100, L2 costa 200
    expect(r.leveledUp).toBe(true);
    expect(r.newLevel).toBe(2);
    const updated = await prisma.character.findUniqueOrThrow({ where: { id: c.id } });
    expect(updated.xp).toBe(150);
  });

  it('promuove di rank al confine 9→10 (E→D)', async () => {
    const c = await makeCharacter({ level: 9, xp: 0, streak: 0 });
    const r = await applyXP(c.id, 900, TODAY);
    expect(r.newLevel).toBe(10);
    expect(r.rankedUp).toBe(true);
    expect(r.newRank).toBe('D');
  });
});

describe('updateStreak', () => {
  it('incrementa se l’ultima quest era ieri', async () => {
    const c = await makeCharacter({ streak: 3 });
    await prisma.character.update({ where: { id: c.id }, data: { lastQuestDate: daysAgo(1) } });
    const r = await updateStreak(c.id, TODAY);
    expect(r.streak).toBe(4);
  });

  it('resta invariata se già aggiornata oggi', async () => {
    const c = await makeCharacter({ streak: 5 });
    await prisma.character.update({ where: { id: c.id }, data: { lastQuestDate: TODAY } });
    const r = await updateStreak(c.id, TODAY);
    expect(r.streak).toBe(5);
  });

  it('riparte da 1 dopo un buco di più giorni', async () => {
    const c = await makeCharacter({ streak: 9 });
    await prisma.character.update({ where: { id: c.id }, data: { lastQuestDate: daysAgo(3) } });
    const r = await updateStreak(c.id, TODAY);
    expect(r.streak).toBe(1);
  });
});

describe('applyInactivityPenalty', () => {
  it('penalizza al massimo 7 giorni, xp mai negativo, level-down, idempotente', async () => {
    const c = await makeCharacter({ level: 5, xp: 10, streak: 8 });
    await prisma.character.update({ where: { id: c.id }, data: { lastQuestDate: daysAgo(10) } });

    const r = await applyInactivityPenalty(c.id, 'UTC');
    expect(r).not.toBeNull();
    expect(r!.daysLost).toBe(7); // cap a 7
    expect(r!.xpLost).toBe(5 * 5 * 7); // level*5 per giorno
    expect(r!.levelDown).toBe(true);

    const updated = await prisma.character.findUniqueOrThrow({ where: { id: c.id } });
    expect(updated.xp).toBeGreaterThanOrEqual(0);
    expect(updated.level).toBeLessThan(5);
    expect(updated.streak).toBe(0);

    // Seconda chiamata nello stesso giorno → nessuna penalità (idempotente)
    const r2 = await applyInactivityPenalty(c.id, 'UTC');
    expect(r2).toBeNull();
  });

  it('nessuna penalità se l’ultima quest è di ieri', async () => {
    const c = await makeCharacter({ level: 5, xp: 50 });
    await prisma.character.update({ where: { id: c.id }, data: { lastQuestDate: daysAgo(1) } });
    expect(await applyInactivityPenalty(c.id, 'UTC')).toBeNull();
  });
});
