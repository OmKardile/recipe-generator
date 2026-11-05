import { NextResponse } from 'next/server';
import { getMealPlan } from '@/lib/dataStore';

/**
 * Read-only legacy endpoint — one-time migration source for the
 * browser-side CacheStorage store (lib/cacheStore.js). See
 * app/api/my-recipes/route.js.
 */
export async function GET() {
  try {
    const plan = await getMealPlan();
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    return NextResponse.json({ error: 'Failed to fetch meal plan' }, { status: 500 });
  }
}
