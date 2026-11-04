import { NextResponse } from 'next/server';
import { updateProduct, deleteProduct } from '@/lib/retailerProducts';
import { getRetailerProvider } from '@/lib/retailers/index';

export const dynamic = 'force-dynamic';

/**
 * PATCH  /api/retailer-products/[id] — update a saved product (price, MRP,
 *        URL, availability) or re-verify it ({ reverified: true } stamps a
 *        fresh verifiedAt — the "last successful price-check" timestamp).
 * DELETE /api/retailer-products/[id]
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const provider = getRetailerProvider(body?.retailerId);
    if (provider && body?.url && typeof body.url === 'string' && !provider.isValidProductUrl(body.url)) {
      return NextResponse.json(
        { error: 'Product URL must be an official product page on the retailer\u2019s website.' },
        { status: 400 }
      );
    }

    const product = await updateProduct(id, body);
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error updating retailer product:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update product.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const products = await deleteProduct(id);
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error deleting retailer product:', error?.message || error);
    return NextResponse.json({ error: 'Failed to delete product.' }, { status: 500 });
  }
}
