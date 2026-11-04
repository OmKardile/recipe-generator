import { NextResponse } from 'next/server';
import { getPlan } from '@/lib/mealPlanStore';
import { consumeFromPantry } from '@/lib/pantryStore';
import { ingredientLine } from '@/lib/recipeUtils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pantry/consume  { planId, date, mealType }
 *
 * Explicit, user-confirmed pantry deduction ("I cooked this meal"). The
 * consumption is based on the meal's ingredients scaled to the servings
 * actually cooked. Nothing is ever deducted silently by generation.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { planId, date, mealType } = body;

    if (!planId || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
      return NextResponse.json({ error: 'planId and date (YYYY-MM-DD) are required.' }, { status: 400 });
    }

    const plan = await getPlan(planId);
    if (!plan) return NextResponse.json({ error: 'Meal plan not found.' }, { status: 404 });

    const day = plan.days.find((d) => d.date === date);
    const meal = day?.meals?.[mealType];
    if (!meal?.recipe?.ingredients?.length) {
      return NextResponse.json({ error: 'That meal slot has no ingredients.' }, { status: 404 });
    }

    const baseServings = meal.recipe.servings || meal.servings || 1;
    const factor = (meal.servings || baseServings) / baseServings;
    const consumed = meal.recipe.ingredients
      .filter((ing) => Number(ing.amount) > 0 && ing.unit !== 'to taste')
      .map((ing) => ({
        name: ing.name,
        amount: Math.round(Number(ing.amount) * factor * 100) / 100,
        unit: ing.unit,
      }));

    const { updated, skipped } = await consumeFromPantry(consumed);

    // Record the cooking event on the meal itself.
    meal.cookedAt = new Date().toISOString();
    const { savePlan } = await import('@/lib/mealPlanStore');
    await savePlan(plan);

    return NextResponse.json({
      pantry: updated,
      skipped,
      consumedLines: consumed.map((c) => ingredientLine({ ...c, note: null })),
    });
  } catch (error) {
    console.error('Error consuming pantry:', error?.message || error);
    return NextResponse.json({ error: 'Failed to update pantry.' }, { status: 500 });
  }
}
