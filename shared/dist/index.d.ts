export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
/** XP necessari per salire dal livello dato a quello successivo. */
export declare function xpForNextLevel(level: number): number;
/** Moltiplicatore XP in base alla streak di giorni consecutivi. */
export declare function streakMultiplier(streak: number): number;
/** Rank in base al livello. */
export declare function calcRank(level: number): Rank;
