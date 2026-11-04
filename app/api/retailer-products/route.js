import { NextResponse } from 'next/server';
import { listProducts, addProduct } from '@/lib/retailerProducts';
import { getRetailerProvider } from '@/lib/retailers/index';
import { supermarketTermsFor } from '@/lib/productMatching';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/retailer-products ?retailerId=&canonical= — user-verified
 *       product catalog (with DMart search links per entry)
 * POST /api/retailer-products — save a product the user verified on the
 *       retailer's site (price, package size, optional product URL)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get('retailerId') || undefined;
    const canonical = searchParams.get('canonical') || undefined;
    const products = await listProducts({ retailerId, canonical });
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error listing retailer products:', error?.message || error);
    return NextResponse.json({ error: 'Failed to list products.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const provider = getRetailerProvider(body?.retailerId);
    if (!provider) {
      return NextResponse.json(
        { error: 'retailerId must match a supported retailer.' },
        { status: 400 }
      );
    }
    // Product URLs, when given, must be official retailer pages.
    if (body?.url && typeof body.url === 'string' && !provider.isValidProductUrl(body.url)) {
      return NextResponse.json(
        { error: 'Product URL must be an official product page on the retailer\u2019s website.' },
        { status: 400 }
      );
    }

    const product = await addProduct({
      ...body,
      // Default the search term to the supermarket alias (Jeera, Atta, …).
      searchTerm: body?.searchTerm || supermarketTermsFor(body?.canonical, body?.displayName)[0],
    });
    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error saving retailer product:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save product.' },
      { status: 400 }
    );
  }
}
