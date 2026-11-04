import { NextResponse } from 'next/server';
import {
  getCurrentList,
  generateGroceryList,
  mutateGroceryList,
  purchasedItemsToPantryLines,
} from '@/lib/groceryStore';
import { getHousehold } from '@/lib/householdStore';
import { computeCostSummary } from '@/lib/grocery';

export const dynamic = 'force-dynamic';

/**
 * GET   /api/grocery                       — current list + cost summary
 * POST  /api/grocery { mealPlanId }        — (re)generate from a meal plan;
 *                                             purchased state, custom items and
 *                                             manual prices survive
 * PATCH /api/grocery { action, ... }       — togglePurchased | updateItem |
 *                                             setPrice | addCustom | removeItem |
 *                                             clearPurchased | getPantryLines
 */

export async function GET() {
  try {
    const [list, household] = await Promise.all([getCurrentList(), getHousehold()]);
    return NextResponse.json({
      list,
      summary: list ? computeCostSummary(list.items, household) : null,
      currency: household.currency || 'INR',
    });
  } catch (error) {
    console.error('Error fetching grocery list:', error?.message || error);
    return NextResponse.json({ error: 'Failed to load grocery list.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body?.mealPlanId) {
      return NextResponse.json({ error: 'mealPlanId is required.' }, { status: 400 });
    }
    const { list, summary } = await generateGroceryList(body.mealPlanId);
    return NextResponse.json({ list, summary });
  } catch (error) {
    console.error('Error generating grocery list:', error?.message || error);
    const notFound = String(error?.message || '').includes('not found');
    return NextResponse.json(
      { error: notFound ? 'That meal plan no longer exists.' : 'Failed to generate grocery list.' },
      { status: notFound ? 404 : 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Helper action: lines ready to add into the pantry after shopping.
    if (body?.action === 'getPantryLines') {
      const lines = await purchasedItemsToPantryLines();
      return NextResponse.json({ lines });
    }

    const result = await mutateGroceryList(body);
    if (!result) return NextResponse.json({ error: 'No grocery list yet — generate one first.' }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating grocery list:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update grocery list.' },
      { status: 400 }
    );
  }
}
