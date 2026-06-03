import { ActivityLevel, Sex } from '@prisma/client';

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calcNutritionGoals(
  weight: number,
  height: number,
  age: number,
  sex: Sex,
  activityLevel: ActivityLevel
) {
  const bmr =
    sex === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = bmr * ACTIVITY_FACTORS[activityLevel];
  const protein = weight * 2;
  const fat = (tdee * 0.25) / 9;
  const carbs = (tdee - protein * 4 - fat * 9) / 4;

  return {
    calories: Math.round(tdee),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
  };
}
