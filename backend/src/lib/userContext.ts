import { prisma } from './prisma';
import { DEFAULT_TZ } from './dates';

interface UserContext {
  tz: string;
  goals: string[];
}

const cache = new Map<string, UserContext & { expiresAt: number }>();
const TTL = 10 * 60 * 1000;

/** Timezone + obiettivi dell'utente, con cache in memoria (TTL 10 min). */
export async function getUserContext(userId: string): Promise<UserContext> {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return { tz: hit.tz, goals: hit.goals };

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { timezone: true, goals: true },
  });
  const ctx: UserContext = { tz: profile?.timezone ?? DEFAULT_TZ, goals: profile?.goals ?? [] };
  cache.set(userId, { ...ctx, expiresAt: Date.now() + TTL });
  return ctx;
}

export function invalidateUserContext(userId: string) {
  cache.delete(userId);
}
