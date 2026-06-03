import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { searchFoods } from '../services/foodService';
import { parseFoodWithAI } from '../services/aiService';
import { applyXP, applyStats } from '../services/levelService';
import { runUnlockCheck } from '../services/unlockService';

const router = Router();

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

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

router.get('/goals', requireAuth, async (req, res: Response) => {
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
});

router.get('/today', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({
    where: { userId },
    include: {
      nutritionGoal: true,
      mealLogs: {
        where: { date: today() },
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

  const todayDate = today();
  const rewardGiven = character.lastNutritionRewardDate?.getTime() === todayDate.getTime();

  res.json({
    meals,
    totals: { calories: round2(dayTotals.calories), protein: round2(dayTotals.protein), carbs: round2(dayTotals.carbs), fat: round2(dayTotals.fat) },
    goals: character.nutritionGoal,
    rewardGiven,
  });
});

router.get('/foods/search', requireAuth, async (req, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) {
    res.status(400).json({ error: 'Query too short' });
    return;
  }
  const foods = await searchFoods(q);
  res.json(foods);
});

router.post('/ai-parse', requireAuth, async (req, res: Response) => {
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
    console.error('AI parse error:', err);
    res.status(503).json({ error: 'AI non disponibile, riprova tra poco.' });
  }
});

router.post('/meals', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const schema = z.object({ mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const existing = await prisma.mealLog.findFirst({
    where: { characterId: character.id, date: today(), mealType: parsed.data.mealType },
  });
  if (existing) { res.json(existing); return; }

  const meal = await prisma.mealLog.create({
    data: { characterId: character.id, date: today(), mealType: parsed.data.mealType },
  });
  res.status(201).json(meal);
});

router.post('/meals/:id/items', requireAuth, async (req, res: Response) => {
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

  await checkAndGrantVitReward(character.id, userId);

  res.status(201).json(item);
});

router.delete('/meals/:mealId/items/:itemId', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const character = await prisma.character.findUniqueOrThrow({ where: { userId } });
  const meal = await prisma.mealLog.findFirst({ where: { id: req.params.mealId, characterId: character.id } });
  if (!meal) { res.status(404).json({ error: 'Meal not found' }); return; }

  await prisma.mealItem.deleteMany({ where: { id: req.params.itemId, mealLogId: meal.id } });
  res.status(204).send();
});

async function checkAndGrantVitReward(characterId: string, userId: string) {
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: { nutritionGoal: true },
  });
  if (!character.nutritionGoal) return;

  const todayDate = today();
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
    await applyXP(characterId, 50);
    await runUnlockCheck(characterId);
  }
}

export default router;
