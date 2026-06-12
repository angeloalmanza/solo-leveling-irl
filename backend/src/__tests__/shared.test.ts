import { describe, it, expect } from 'vitest';
import { calcRank, streakMultiplier, xpForNextLevel } from '@solo/shared';

describe('calcRank — confini', () => {
  it.each([
    [1, 'E'],
    [9, 'E'],
    [10, 'D'],
    [24, 'D'],
    [25, 'C'],
    [49, 'C'],
    [50, 'B'],
    [74, 'B'],
    [75, 'A'],
    [99, 'A'],
    [100, 'S'],
    [150, 'S'],
  ])('livello %i → rank %s', (level, rank) => {
    expect(calcRank(level)).toBe(rank);
  });
});

describe('streakMultiplier', () => {
  it.each([
    [0, 1.0],
    [6, 1.0],
    [7, 1.1],
    [13, 1.1],
    [14, 1.25],
    [29, 1.25],
    [30, 1.5],
    [100, 1.5],
  ])('streak %i → ×%f', (streak, mult) => {
    expect(streakMultiplier(streak)).toBe(mult);
  });
});

describe('xpForNextLevel', () => {
  it('è level * 100', () => {
    expect(xpForNextLevel(1)).toBe(100);
    expect(xpForNextLevel(25)).toBe(2500);
  });
});
