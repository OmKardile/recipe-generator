import { NextResponse } from 'next/server';
import { getShoppingLocation, saveShoppingLocation } from '@/lib/shoppingLocationStore';
import { getRetailerProvider, listRetailers } from '@/lib/retailers/index';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/shopping-location — saved location + retailer meta + honest
 *                              serviceability + fulfilment options
 * POST /api/shopping-location { pincode } — run the serviceability check
 *                              for a PIN without saving anything
 * PUT  /api/shopping-location — save { pincode, retailerId, fulfilment,
 *                              pickupPoint, serviceabilityConfirmed }
 */

async function locationPayload(location) {
  const provider = getRetailerProvider(location.retailerId);
  const [serviceability, fulfilment] = provider
    ? await Promise.all([
        provider.getServiceability(location.pincode),
        provider.getFulfilmentOptions(location.pincode),
      ])
    : [null, null];
  return {
    location,
    retailers: listRetailers(),
    serviceability,
    fulfilment,
    retailer: provider
      ? { id: provider.id, label: provider.label, siteUrl: provider.siteUrl }
      : null,
  };
}

export async function GET() {
  try {
    const location = await getShoppingLocation();
    return NextResponse.json(await locationPayload(location));
  } catch (error) {
    console.error('Error fetching shopping location:', error?.message || error);
    return NextResponse.json({ error: 'Failed to load shopping location.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const provider = getRetailerProvider(body?.retailerId) || getRetailerProvider('dmart');
    if (!provider) {
      return NextResponse.json({ error: 'Unknown retailer.' }, { status: 400 });
    }
    const serviceability = await provider.getServiceability(body?.pincode);
    return NextResponse.json({ serviceability });
  } catch (error) {
    console.error('Error checking serviceability:', error?.message || error);
    return NextResponse.json({ error: 'Failed to check serviceability.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const location = await saveShoppingLocation(body);
    return NextResponse.json(await locationPayload(location));
  } catch (error) {
    console.error('Error saving shopping location:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save shopping location.' },
      { status: 400 }
    );
  }
}
