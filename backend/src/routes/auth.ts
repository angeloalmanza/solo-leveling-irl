import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signAccess, signRefresh, verifyRefresh, hashToken, REFRESH_TTL_DAYS } from '../lib/jwt';
import { calcNutritionGoals } from '../utils/nutrition';
import { ActivityLevel, Sex } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../lib/logger';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  characterName: z.string().min(1).max(30),
  weight: z.number().positive(),
  height: z.number().positive(),
  age: z.number().int().min(10).max(120),
  sex: z.enum(['male', 'female']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  timezone: z.string().min(1).max(64).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/** Firma access+refresh e persiste l'hash del refresh con scadenza. */
async function issueTokens(userId: string) {
  const accessToken = signAccess(userId);
  const refreshToken = signRefresh(userId);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(refreshToken), expiresAt },
  });
  return { accessToken, refreshToken };
}

/** Elimina i refresh token scaduti (chiamata all'avvio). */
export async function cleanupExpiredRefreshTokens() {
  const { count } = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  if (count > 0) logger.info({ count }, 'Refresh token scaduti rimossi');
}

router.post('/register', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, characterName, weight, height, age, sex, activityLevel, timezone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const goals = calcNutritionGoals(weight, height, age, sex as Sex, activityLevel as ActivityLevel);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      profile: {
        create: {
          weight,
          height,
          age,
          sex: sex as Sex,
          activityLevel: activityLevel as ActivityLevel,
          ...(timezone ? { timezone } : {}),
        },
      },
      character: {
        create: {
          name: characterName,
          nutritionGoal: { create: goals },
        },
      },
    },
    include: { character: true },
  });

  const { accessToken, refreshToken } = await issueTokens(user.id);
  res.status(201).json({ accessToken, refreshToken, characterName: user.character!.name });
}));

router.post('/login', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const { accessToken, refreshToken } = await issueTokens(user.id);
  res.json({ accessToken, refreshToken });
}));

router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Missing refresh token' });
    return;
  }

  // 1. La firma deve essere valida
  let userId: string;
  try {
    userId = verifyRefresh(refreshToken).sub;
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  // 2. Il token deve esistere nel DB
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
  });
  if (!stored) {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  // 3. Riuso di un token già revocato → possibile furto: revoca l'intera famiglia
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    logger.warn({ userId: stored.userId }, 'Refresh token reuse detected: famiglia revocata');
    res.status(401).json({ error: 'Refresh token reuse detected' });
    return;
  }

  // 4. Scaduto
  if (stored.expiresAt < new Date()) {
    res.status(401).json({ error: 'Refresh token expired' });
    return;
  }

  // 5. Rotazione: revoca il vecchio, emette una coppia nuova
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });
  const tokens = await issueTokens(userId);
  res.json(tokens);
}));

router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  res.status(204).send();
}));

export default router;
