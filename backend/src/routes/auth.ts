import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signAccess, signRefresh, verifyRefresh } from '../lib/jwt';
import { calcNutritionGoals } from '../utils/nutrition';
import { ActivityLevel, Sex } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  characterName: z.string().min(1).max(30),
  weight: z.number().positive(),
  height: z.number().positive(),
  age: z.number().int().min(10).max(120),
  sex: z.enum(['male', 'female']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, characterName, weight, height, age, sex, activityLevel } = parsed.data;

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
        create: { weight, height, age, sex: sex as Sex, activityLevel: activityLevel as ActivityLevel },
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

  const accessToken = signAccess(user.id);
  const refreshToken = signRefresh(user.id);

  res.status(201).json({ accessToken, refreshToken, characterName: user.character!.name });
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
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

  const accessToken = signAccess(user.id);
  const refreshToken = signRefresh(user.id);

  res.json({ accessToken, refreshToken });
}));

router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Missing refresh token' });
    return;
  }
  try {
    const payload = verifyRefresh(refreshToken);
    const accessToken = signAccess(payload.sub);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}));

export default router;
