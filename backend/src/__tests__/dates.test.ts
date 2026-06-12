import { describe, it, expect } from 'vitest';
import { todayFor, weekStartFor } from '../lib/dates';

const ymd = (d: Date) => d.toISOString().split('T')[0];

describe('todayFor — a cavallo della mezzanotte (Europe/Rome)', () => {
  it('estate: 23:30 UTC = 01:30 Roma → giorno dopo', () => {
    // 11 giu 23:30 UTC, Roma è UTC+2 → 12 giu 01:30
    expect(ymd(todayFor('Europe/Rome', new Date('2026-06-11T23:30:00Z')))).toBe('2026-06-12');
  });

  it('estate: 21:30 UTC = 23:30 Roma → stesso giorno', () => {
    expect(ymd(todayFor('Europe/Rome', new Date('2026-06-11T21:30:00Z')))).toBe('2026-06-11');
  });

  it('inverno (UTC+1): 23:30 UTC = 00:30 Roma → giorno dopo', () => {
    expect(ymd(todayFor('Europe/Rome', new Date('2026-01-15T23:30:00Z')))).toBe('2026-01-16');
  });

  it('mezzanotte UTC pura senza tz usa il default', () => {
    expect(ymd(todayFor('UTC', new Date('2026-06-11T12:00:00Z')))).toBe('2026-06-11');
  });
});

describe('weekStartFor — lunedì della settimana locale', () => {
  it('restituisce sempre un lunedì (UTC)', () => {
    const monday = weekStartFor('Europe/Rome', new Date('2026-06-12T10:00:00Z')); // venerdì
    expect(monday.getUTCDay()).toBe(1);
    expect(ymd(monday)).toBe('2026-06-08');
  });

  it('di domenica torna il lunedì precedente, non quello successivo', () => {
    const sunday = new Date('2026-06-14T12:00:00Z'); // domenica
    const monday = weekStartFor('Europe/Rome', sunday);
    expect(ymd(monday)).toBe('2026-06-08');
  });
});
