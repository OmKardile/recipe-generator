import { NextResponse } from 'next/server';
import {
  getCurrentList,
  generateGroceryList,
  mutateGroceryList,
  purchasedItemsToPantryLines,
} from '@/lib/groceryStore';
import { getHousehold } from '@/lib/householdStore';
import { getShoppingLocation } from '@/lib/shoppingLocationStore';
import { getRetailerProvider } from '@/lib/retailers/index';
import { estimateShoppingCart, matchIngredient, aliasFamily } from '@/lib/productMatching';
import { listProducts } from '@/lib/retailerProducts';
import { computeCostSummary } from '@/lib/grocery';

export const dynamic = 'force-dynamic';

/**
 * GET   /api/grocery                       — current list + cost summary +
 *                                             retailer cart intelligence
 * POST  /api/grocery { mealPlanId }        — (re)generate from a meal plan;
 *                                             purchased state, custom items,
 *                                             manual prices and selected
 *                                             products survive
 * PATCH /api/grocery { action, ... }       — togglePurchased | updateItem |
 *                                             setPrice | addCustom | removeItem |
 *                                             clearPurchased | getPantryLines |
 *                                             selectProduct | clearProduct
 */

/** Assemble the retailer-aware cart view for a list. */
async function buildCartPayload(list) {
  if (!list) return null;
  const [household, location] = await Promise.all([getHousehold(), getShoppingLocation()]);
  const cart = estimateShoppingCart(list.items, {
    budget: household.weeklyBudget,
    pincode: location.pincode,
  });

  // Match context per still-unmatched item, so the UI knows whether manual
  // selection is even possible (has candidates) or the product must be
  // created from scratch.
  const provider = getRetailerProvider(location.retailerId);
  const retailerCatalog = provider ? await listProducts({ retailerId: provider.id }) : [];
  const byCanonical = new Map();
  for (const p of retailerCatalog) {
    const arr = byCanonical.get(p.canonical) || [];
    arr.push(p);
    byCanonical.set(p.canonical, arr);
  }
  const needsSelection = [];
  for (const item of list.items) {
    if (item.custom || item.product || item.toBuyBase === 0) continue;
    const familyEntries = aliasFamily(item.canonical).flatMap((k) => byCanonical.get(k) || []);
    if (!familyEntries.length) continue;
    const matched = matchIngredient(item, { catalogEntries: familyEntries });
    needsSelection.push({
      id: item.id,
      name: item.name,
      candidateCount: matched.candidates.length,
      needsApproval: matched.needsApproval,
    });
  }

  return { cart, needsSelection };
}

export async function GET() {
  try {
    const [list, household] = await Promise.all([getCurrentList(), getHousehold()]);
    return NextResponse.json({
      list,
      summary: list ? computeCostSummary(list.items, household) : null,
      cartPayload: await buildCartPayload(list),
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
    return NextResponse.json({ list, summary, cartPayload: await buildCartPayload(list) });
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
    return NextResponse.json({
      ...result,
      cartPayload: await buildCartPayload(result.list),
    });
  } catch (error) {
    console.error('Error updating grocery list:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update grocery list.' },
      { status: 400 }
    );
  }
}
