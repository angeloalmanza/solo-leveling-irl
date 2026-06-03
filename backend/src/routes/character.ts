import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

const router = Router();

router.get('/me', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { unlockedAchievements: { include: { achievement: true } } },
  });
  if (!character) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  res.json(character);
});

const PatchSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  activeTitle: z.string().nullable().optional(),
});

router.patch('/me', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const parsed = PatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const character = await prisma.character.update({
    where: { userId },
    data: parsed.data,
  });
  res.json(character);
});

export default router;
