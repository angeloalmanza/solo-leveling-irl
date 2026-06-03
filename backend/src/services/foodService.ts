import { prisma } from '../lib/prisma';

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

interface OFFResponse {
  products: OFFProduct[];
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

export async function searchFoods(query: string) {
  const q = query.trim().toLowerCase();

  const cached = await prisma.food.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    take: 10,
  });

  if (cached.length >= 5) return cached;

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,nutriments`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return cached;

    const json = (await res.json()) as OFFResponse;
    const products = (json.products ?? []).map(parseOFFProduct).filter(Boolean) as ReturnType<typeof parseOFFProduct>[];

    const unique = products.filter(
      (p) => p && !cached.some((c) => c.name.toLowerCase() === p.name.toLowerCase())
    );

    const created: typeof cached = [];
    for (const p of unique.slice(0, 10)) {
      if (!p) continue;
      const exists = await prisma.food.findFirst({ where: { name: { equals: p.name, mode: 'insensitive' } } });
      if (!exists) {
        const food = await prisma.food.create({ data: p }).catch(() => null);
        if (food) created.push(food);
      }
    }

    return [...cached, ...created].slice(0, 15);
  } catch {
    return cached;
  }
}
