import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import { authLimiter, aiLimiter } from '../middleware/rateLimit';
import { invalidateUserContext } from '../lib/userContext';

const router = Router();

const DeleteSchema = z.object({ password: z.string().min(1) });

// Cancellazione account (richiesta da App Store / Google Play). Cascade fa il resto.
router.delete('/', requireAuth, authLimiter, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const parsed = DeleteSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Password richiesta');

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Password errata');

  await prisma.user.delete({ where: { id: userId } }); // cascade su profilo, character e tutto il resto
  invalidateUserContext(userId);
  logger.info({ userId }, 'account deleted');
  res.status(204).send();
}));

// Export di tutti i dati dell'utente (portabilità dati / GDPR).
router.get('/export', requireAuth, aiLimiter, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const [user, profile, character] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, createdAt: true } }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.character.findUnique({
      where: { userId },
      include: {
        dailyQuests: true,
        weeklyBosses: { include: { tasks: true } },
        mealLogs: { include: { items: { include: { food: true } } } },
        bodyLogs: true,
        statSnapshots: true,
        skills: true,
        unlockedShadows: true,
        unlockedAchievements: true,
        unlockedSkills: true,
        weeklySummaries: true,
        nutritionGoal: true,
      },
    }),
  ]);

  res.setHeader('Content-Disposition', 'attachment; filename="solo-leveling-irl-export.json"');
  res.json({ exportedAt: new Date().toISOString(), user, profile, character });
}));

export default router;
