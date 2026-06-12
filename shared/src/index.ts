// Formule di gioco — UNICA fonte di verità condivisa fra backend e mobile.
// Se cambi una formula qui, entrambi i lati restano allineati.

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

/** XP necessari per salire dal livello dato a quello successivo. */
export function xpForNextLevel(level: number): number {
  return level * 100;
}

/** Moltiplicatore XP in base alla streak di giorni consecutivi. */
export function streakMultiplier(streak: number): number {
  if (streak >= 30) return 1.5;
  if (streak >= 14) return 1.25;
  if (streak >= 7) return 1.1;
  return 1.0;
}

/** Rank in base al livello. */
export function calcRank(level: number): Rank {
  if (level >= 100) return 'S';
  if (level >= 75) return 'A';
  if (level >= 50) return 'B';
  if (level >= 25) return 'C';
  if (level >= 10) return 'D';
  return 'E';
}
