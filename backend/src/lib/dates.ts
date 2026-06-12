export const DEFAULT_TZ = 'Europe/Rome';

/** "YYYY-MM-DD" del giorno corrente nel fuso orario dato. */
function localYMD(tz: string, when: Date = new Date()): string {
  // en-CA formatta come YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(when);
}

/**
 * Mezzanotte UTC del giorno-calendario locale dell'utente.
 * Compatibile con le colonne @db.Date (che memorizzano solo la data).
 */
export function todayFor(tz: string = DEFAULT_TZ, when: Date = new Date()): Date {
  return new Date(`${localYMD(tz, when)}T00:00:00.000Z`);
}

/** Mezzanotte UTC del lunedì della settimana locale dell'utente. */
export function weekStartFor(tz: string = DEFAULT_TZ, when: Date = new Date()): Date {
  const today = todayFor(tz, when);
  const dow = today.getUTCDay(); // 0=dom, 1=lun, ...
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + diff);
  return monday;
}

/** Differenza in giorni interi fra due date @db.Date (UTC). */
export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a = new Date(from);
  a.setUTCHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setUTCHours(0, 0, 0, 0);
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}
