import { prisma } from '../lib/prisma';

let counter = 0;

/** Cancella tutti gli utenti (cascade su character e dati collegati). */
export async function resetUsers() {
  await prisma.user.deleteMany();
}

/** Crea un utente + character minimale e lo restituisce. */
export async function makeCharacter(overrides: Partial<{ level: number; xp: number; streak: number; str: number }> = {}) {
  counter++;
  const user = await prisma.user.create({
    data: {
      email: `test${counter}_${Date.now()}@example.com`,
      passwordHash: 'x',
      profile: {
        create: { weight: 70, height: 175, age: 30, sex: 'male', activityLevel: 'moderate' },
      },
      character: {
        create: {
          name: `Hunter${counter}`,
          level: overrides.level ?? 1,
          xp: overrides.xp ?? 0,
          streak: overrides.streak ?? 0,
          str: overrides.str ?? 10,
        },
      },
    },
    include: { character: true },
  });
  return user.character!;
}
