import { NextResponse } from 'next/server';
import { getHousehold, saveHousehold } from '@/lib/householdStore';

export const dynamic = 'force-dynamic';

/** GET /api/household — saved household preferences. */
export async function GET() {
  try {
    const household = await getHousehold();
    return NextResponse.json({ household });
  } catch (error) {
    console.error('Error fetching household:', error?.message || error);
    return NextResponse.json({ error: 'Failed to load household preferences.' }, { status: 500 });
  }
}

/** PUT /api/household — validate + persist preferences. */
export async function PUT(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const household = await saveHousehold(body);
    return NextResponse.json({ household });
  } catch (error) {
    console.error('Error saving household:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save household preferences.' },
      { status: 400 }
    );
  }
}
