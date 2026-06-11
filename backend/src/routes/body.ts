import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const BodyLogSchema = z.object({
  weight: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  chest: z.number().positive().optional(),
});

router.get('/logs', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });

  const logs = await prisma.bodyLog.findMany({
    where: { characterId: char.id },
    orderBy: { date: 'desc' },
    take: 30,
  });

  res.json(logs.map((l) => ({
    ...l,
    date: new Date(l.date).toISOString().split('T')[0],
  })));
}));

router.post('/logs', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const parsed = BodyLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const log = await prisma.bodyLog.upsert({
    where: { characterId_date: { characterId: char.id, date: today } },
    create: { characterId: char.id, date: today, ...parsed.data },
    update: parsed.data,
  });

  if (parsed.data.weight !== undefined) {
    await prisma.userProfile.updateMany({
      where: { userId },
      data: { weight: parsed.data.weight },
    });
  }

  res.json({ ...log, date: new Date(log.date).toISOString().split('T')[0] });
}));

export default router;
