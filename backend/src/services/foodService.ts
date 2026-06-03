import { prisma } from '../lib/prisma';

const USDA_API_KEY = 'DEMO_KEY';

interface OFFProduct {
  product_name?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
  };
}

interface USDAFood {
  description: string;
  foodNutrients: { nutrientId: number; value: number }[];
}

function parseOFFProduct(p: OFFProduct) {
  const name = p.product_name?.trim();
  const n = p.nutriments ?? {};
  if (!name || !n['energy-kcal_100g']) return null;
  return {
    name,
    calories: Math.round(n['energy-kcal_100g'] ?? 0),
    protein: Math.round((n.proteins_100g ?? 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
    fat: Math.round((n.fat_100g ?? 0) * 10) / 10,
    fiber: Math.round((n.fiber_100g ?? 0) * 10) / 10,
    source: 'openfoodfacts',
  };
}

function parseUSDAFood(f: USDAFood) {
  const name = f.description?.trim();
  if (!name) return null;
  const getNutrient = (id: number) => f.foodNutrients.find((n) => n.nutrientId === id)?.value ?? 0;
  const calories = Math.round(getNutrient(1008));
  if (!calories) return null;
  return {
    name,
    calories,
    protein: Math.round(getNutrient(1003) * 10) / 10,
    carbs: Math.round(getNutrient(1005) * 10) / 10,
    fat: Math.round(getNutrient(1004) * 10) / 10,
    fiber: Math.round(getNutrient(1079) * 10) / 10,
    source: 'usda',
  };
}

async function queryOpenFoodFacts(q: string) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,nutriments&lc=it`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return [];
  const json = (await res.json()) as { products: OFFProduct[] };
  return (json.products ?? []).map(parseOFFProduct).filter(Boolean) as NonNullable<ReturnType<typeof parseOFFProduct>>[];
}

async function queryUSDA(q: string) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&api_key=${USDA_API_KEY}&pageSize=10&dataType=SR%20Legacy,Foundation,Branded`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return [];
  const json = (await res.json()) as { foods: USDAFood[] };
  return (json.foods ?? []).map(parseUSDAFood).filter(Boolean) as NonNullable<ReturnType<typeof parseUSDAFood>>[];
}

async function saveUnique(
  products: { name: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; source: string }[],
  existing: { name: string }[],
) {
  const saved: { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; fiber: number }[] = [];
  for (const p of products) {
    if (existing.some((c) => c.name.toLowerCase() === p.name.toLowerCase())) continue;
    if (saved.some((s) => s.name.toLowerCase() === p.name.toLowerCase())) continue;
    const exists = await prisma.food.findFirst({ where: { name: { equals: p.name, mode: 'insensitive' } } });
    if (!exists) {
      const food = await prisma.food.create({ data: p }).catch(() => null);
      if (food) saved.push(food);
    } else {
      saved.push(exists);
    }
  }
  return saved;
}

export async function searchFoods(query: string) {
  const q = query.trim().toLowerCase();

  const cached = await prisma.food.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    take: 15,
  });

  if (cached.length >= 8) return cached;

  const results: { name: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; source: string }[] = [];

  try {
    const offResults = await queryOpenFoodFacts(q);
    results.push(...offResults);
  } catch { /* fallback to USDA */ }

  if (results.length < 5) {
    try {
      const usdaResults = await queryUSDA(q);
      results.push(...usdaResults);
    } catch { /* ignore */ }
  }

  const saved = await saveUnique(results, cached);
  return [...cached, ...saved].slice(0, 15);
}
