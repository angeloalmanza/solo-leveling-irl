import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { searchFoods } from '../services/foodService';
import { parseFoodWithAI, analyzeMealPhoto } from '../services/aiService';
import { applyXP, applyStats } from '../services/levelService';
import { runUnlockCheck } from '../services/unlockService';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../lib/logger';
import { aiLimiter } from '../middleware/rateLimit';
import { todayFor } from '../lib/dates';
import { getUserContext } from '../lib/userContext';

const router = Router();

// Limite massimo per l'immagine base64 (~7.5MB binari ≈ 10MB base64)
const MAX_IMAGE_BASE64_LEN = 10 * 1024 * 1024;

function calcMealTotals(items: { quantity: number; food: { calories: number; protein: number; carbs: number; fat: number } }[]) {
  return items.reduce(
    (acc, item) => {
      const f = item.quantity / 100;
      acc.calories += item.food.calories * f;
      acc.protein += item.food.protein * f;
      acc.carbs += item.food.carbs * f;
      acc.fat += item.food.fat * f;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function round2(n: number) { return Math.round(n * 10) / 10; }

router.get('/goals', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({
    where: { userId },
    include: { nutritionGoal: true },
  });
  if (!character.nutritionGoal) {
    res.status(404).json({ error: 'Nutrition goals not set' });
    return;
  }
  res.json(character.nutritionGoal);
}));

router.get('/today', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const todayDate = todayFor((await getUserContext(userId)).tz);
  const character = await prisma.character.findUniqueOrThrow({
    where: { userId },
    include: {
      nutritionGoal: true,
      mealLogs: {
        where: { date: todayDate },
        include: { items: { include: { food: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const meals = character.mealLogs.map((ml) => {
    const totals = calcMealTotals(ml.items);
    return {
      id: ml.id,
      mealType: ml.mealType,
      items: ml.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        food: i.food,
        itemCalories: round2(i.food.calories * i.quantity / 100),
      })),
      totals: { calories: round2(totals.calories), protein: round2(totals.protein), carbs: round2(totals.carbs), fat: round2(totals.fat) },
    };
  });

  const dayTotals = meals.reduce(
    (acc, m) => {
      acc.calories += m.totals.calories;
      acc.protein += m.totals.protein;
      acc.carbs += m.totals.carbs;
      acc.fat += m.totals.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const rewardGiven = character.lastNutritionRewardDate?.getTime() === todayDate.getTime();

  res.json({
    meals,
    totals: { calories: round2(dayTotals.calories), protein: round2(dayTotals.protein), carbs: round2(dayTotals.carbs), fat: round2(dayTotals.fat) },
    goals: character.nutritionGoal,
    rewardGiven,
  });
}));

router.get('/foods/search', requireAuth, asyncHandler(async (req, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) {
    res.status(400).json({ error: 'Query too short' });
    return;
  }
  const foods = await searchFoods(q);
  res.json(foods);
}));

router.post('/ai-parse', requireAuth, aiLimiter, asyncHandler(async (req, res: Response) => {
  const description = String(req.body?.description ?? '').trim();
  if (!description) {
    res.status(400).json({ error: 'description required' });
    return;
  }

  try {
    const parsed = await parseFoodWithAI(description);

    const existing = await prisma.food.findFirst({
      where: { name: { equals: parsed.name, mode: 'insensitive' }, source: 'ai' },
    });

    const foodData = {
      name: parsed.name,
      calories: Math.round(parsed.caloriesPer100g),
      protein: Math.round(parsed.proteinPer100g * 10) / 10,
      carbs: Math.round(parsed.carbsPer100g * 10) / 10,
      fat: Math.round(parsed.fatPer100g * 10) / 10,
      fiber: Math.round(parsed.fiberPer100g * 10) / 10,
      source: 'ai',
    };

    const food = existing
      ? await prisma.food.update({ where: { id: existing.id }, data: foodData })
      : await prisma.food.create({ data: foodData });

    res.json({ food, grams: parsed.grams });
  } catch (err) {
    logger.error({ err }, 'AI parse error');
    res.status(503).json({ error: 'AI non disponibile, riprova tra poco.' });
  }
}));

router.post('/meals', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({ mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const date = todayFor((await getUserContext(userId)).tz);

  // upsert sul vincolo unico: niente più doppioni da richieste concorrenti
  const meal = await prisma.mealLog.upsert({
    where: { characterId_date_mealType: { characterId: character.id, date, mealType: parsed.data.mealType } },
    create: { characterId: character.id, date, mealType: parsed.data.mealType },
    update: {},
  });
  res.status(201).json(meal);
}));

router.post('/meals/:id/items', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({ foodId: z.string(), quantity: z.number().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const meal = await prisma.mealLog.findFirst({
    where: { id: req.params.id, characterId: character.id },
  });
  if (!meal) { res.status(404).json({ error: 'Meal not found' }); return; }

  const item = await prisma.mealItem.create({
    data: { mealLogId: meal.id, foodId: parsed.data.foodId, quantity: parsed.data.quantity },
    include: { food: true },
  });

  await checkAndGrantVitReward(character.id, todayFor((await getUserContext(userId)).tz));

  res.status(201).json(item);
}));

router.patch('/meals/:mealId/items/:itemId', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({ quantity: z.number().positive().max(5000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const meal = await prisma.mealLog.findFirst({ where: { id: req.params.mealId, characterId: character.id } });
  if (!meal) { res.status(404).json({ error: 'Meal not found' }); return; }

  const updated = await prisma.mealItem.updateMany({
    where: { id: req.params.itemId, mealLogId: meal.id },
    data: { quantity: parsed.data.quantity },
  });
  if (updated.count !== 1) { res.status(404).json({ error: 'Item not found' }); return; }

  const item = await prisma.mealItem.findUniqueOrThrow({
    where: { id: req.params.itemId },
    include: { food: true },
  });
  res.json(item);
}));

router.delete('/meals/:mealId/items/:itemId', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const meal = await prisma.mealLog.findFirst({ where: { id: req.params.mealId, characterId: character.id } });
  if (!meal) { res.status(404).json({ error: 'Meal not found' }); return; }

  await prisma.mealItem.deleteMany({ where: { id: req.params.itemId, mealLogId: meal.id } });
  res.status(204).send();
}));

async function checkAndGrantVitReward(characterId: string, todayDate: Date) {
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: { nutritionGoal: true },
  });
  if (!character.nutritionGoal) return;

  if (character.lastNutritionRewardDate?.getTime() === todayDate.getTime()) return;

  const meals = await prisma.mealLog.findMany({
    where: { characterId, date: todayDate },
    include: { items: { include: { food: true } } },
  });

  const totals = meals.flatMap((m) => m.items).reduce(
    (acc, item) => {
      const f = item.quantity / 100;
      acc.calories += item.food.calories * f;
      acc.protein += item.food.protein * f;
      acc.carbs += item.food.carbs * f;
      acc.fat += item.food.fat * f;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const g = character.nutritionGoal;
  const pct = (
    totals.calories / g.calories +
    totals.protein / g.protein +
    totals.carbs / g.carbs +
    totals.fat / g.fat
  ) / 4;

  if (pct >= 0.8) {
    await prisma.character.update({ where: { id: characterId }, data: { lastNutritionRewardDate: todayDate } });
    await applyStats(characterId, { vit: 1 });
    await applyXP(characterId, 50, todayDate);
    await runUnlockCheck(characterId);
  }
}

// ── Obiettivi personalizzabili ─────────────────────────────────────────────

router.patch('/goals', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({
    calories: z.number().positive(),
    protein: z.number().positive(),
    carbs: z.number().positive(),
    fat: z.number().positive(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const goal = await prisma.nutritionGoal.update({
    where: { characterId: char.id },
    data: { ...parsed.data, isCustom: true },
  });
  res.json(goal);
}));

router.post('/goals/reset', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const goal = await prisma.nutritionGoal.update({
    where: { characterId: char.id },
    data: { isCustom: false },
  });
  res.json(goal);
}));

// ── Pasti Salvati ──────────────────────────────────────────────────────────

router.get('/saved-meals', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const meals = await prisma.savedMeal.findMany({
    where: { characterId: char.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(meals);
}));

router.post('/saved-meals', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({
    name: z.string().min(1).max(60),
    mealLogId: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const mealLog = await prisma.mealLog.findFirst({
    where: { id: parsed.data.mealLogId, characterId: char.id },
    include: { items: { include: { food: true } } },
  });
  if (!mealLog) { res.status(404).json({ error: 'Pasto non trovato' }); return; }

  const items = mealLog.items.map((i) => ({
    foodId: i.foodId,
    foodName: i.food.name,
    quantity: i.quantity,
  }));

  const saved = await prisma.savedMeal.create({
    data: {
      characterId: char.id,
      name: parsed.data.name,
      mealType: mealLog.mealType,
      items,
    },
  });
  res.status(201).json(saved);
}));

router.delete('/saved-meals/:id', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });
  await prisma.savedMeal.deleteMany({ where: { id: req.params.id, characterId: char.id } });
  res.status(204).send();
}));

router.post('/saved-meals/:id/use', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({ mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const saved = await prisma.savedMeal.findFirst({ where: { id: req.params.id, characterId: char.id } });
  if (!saved) { res.status(404).json({ error: 'Pasto salvato non trovato' }); return; }

  const todayDate = todayFor((await getUserContext(userId)).tz);
  const mealLog = await prisma.mealLog.upsert({
    where: { characterId_date_mealType: { characterId: char.id, date: todayDate, mealType: parsed.data.mealType } },
    create: { characterId: char.id, date: todayDate, mealType: parsed.data.mealType },
    update: {},
  });

  const items = saved.items as { foodId: string; quantity: number }[];
  for (const item of items) {
    const foodExists = await prisma.food.findUnique({ where: { id: item.foodId } });
    if (foodExists) {
      await prisma.mealItem.create({
        data: { mealLogId: mealLog.id, foodId: item.foodId, quantity: item.quantity },
      });
    }
  }

  await checkAndGrantVitReward(char.id, todayDate);
  res.json({ success: true });
}));

// ── Foto AI ────────────────────────────────────────────────────────────────

router.post('/photo-parse', requireAuth, aiLimiter, asyncHandler(async (req, res: Response) => {
  let image = String(req.body?.image ?? '').trim();
  if (!image) { res.status(400).json({ error: 'image (base64) required' }); return; }

  // Rimuove un eventuale data URI prefix e valida formato/dimensione
  const dataUriMatch = image.match(/^data:image\/(jpe?g|png|webp);base64,(.+)$/i);
  if (dataUriMatch) image = dataUriMatch[2];

  if (image.length > MAX_IMAGE_BASE64_LEN) {
    res.status(413).json({ error: 'Immagine troppo grande' });
    return;
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(image)) {
    res.status(400).json({ error: 'Immagine non in formato base64 valido' });
    return;
  }

  try {
    const parsed = await analyzeMealPhoto(image);
    const results = [];

    for (const item of parsed) {
      const existing = await prisma.food.findFirst({
        where: { name: { equals: item.name, mode: 'insensitive' }, source: 'ai' },
      });
      const foodData = {
        name: item.name,
        calories: Math.round(item.caloriesPer100g),
        protein: Math.round(item.proteinPer100g * 10) / 10,
        carbs: Math.round(item.carbsPer100g * 10) / 10,
        fat: Math.round(item.fatPer100g * 10) / 10,
        fiber: Math.round(item.fiberPer100g * 10) / 10,
        source: 'ai',
      };
      const food = existing
        ? await prisma.food.update({ where: { id: existing.id }, data: foodData })
        : await prisma.food.create({ data: foodData });
      results.push({ food, grams: item.grams });
    }

    res.json(results);
  } catch (err) {
    logger.error({ err }, 'Photo parse error');
    res.status(503).json({ error: 'Impossibile analizzare la foto.' });
  }
}));

export default router;
