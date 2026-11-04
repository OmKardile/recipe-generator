import { NextResponse } from 'next/server';
import { getPantry, addPantryItem, pantryExpiryInfo } from '@/lib/pantryStore';

export const dynamic = 'force-dynamic';

/** GET /api/pantry — all pantry items + expiry warnings. */
export async function GET() {
  try {
    const items = await getPantry();
    return NextResponse.json({ items, expiring: pantryExpiryInfo(items) });
  } catch (error) {
    console.error('Error fetching pantry:', error?.message || error);
    return NextResponse.json({ error: 'Failed to load pantry.' }, { status: 500 });
  }
}

/** POST /api/pantry — add one item (merges quantity on name+unit match). */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const item = await addPantryItem(body);
    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error adding pantry item:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to add pantry item.' },
      { status: 400 }
    );
  }
}
