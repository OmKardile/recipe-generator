import { NextResponse } from 'next/server';
import { getPlan, mutatePlan, deletePlan } from '@/lib/mealPlanStore';

export const dynamic = 'force-dynamic';

/**
 * GET    /api/planner/[id]        — full plan
 * PATCH  /api/planner/[id]        — surgical mutations (toggleLock, setServings,
 *                                   setDayCook, setMeal, moveMeal, clearMeal,
 *                                   markCooked, rename)
 * DELETE /api/planner/[id]        — remove a plan
 */

const ACTIONS = [
  'toggleLock', 'setServings', 'setDayCook', 'setMeal',
  'moveMeal', 'clearMeal', 'markCooked', 'rename',
];

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const plan = await getPlan(id);
    if (!plan) return NextResponse.json({ error: 'Meal plan not found.' }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error fetching plan:', error?.message || error);
    return NextResponse.json({ error: 'Failed to fetch meal plan.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (!ACTIONS.includes(body?.action)) {
      return NextResponse.json(
        { error: `action must be one of: ${ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }
    if (body.action === 'setMeal' && !body.recipe?.title) {
      return NextResponse.json({ error: 'setMeal requires a recipe.' }, { status: 400 });
    }

    const plan = await mutatePlan(id, body);
    if (!plan) return NextResponse.json({ error: 'Meal plan or target slot not found.' }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error updating plan:', error?.message || error);
    return NextResponse.json({ error: 'Failed to update meal plan.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deletePlan(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting plan:', error?.message || error);
    return NextResponse.json({ error: 'Failed to delete meal plan.' }, { status: 500 });
  }
}
