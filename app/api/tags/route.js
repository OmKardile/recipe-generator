import { NextResponse } from 'next/server';
import { getTags } from '@/lib/dataStore';

/**
 * Read-only legacy endpoint — one-time migration source for the
 * browser-side CacheStorage store (lib/cacheStore.js). See
 * app/api/my-recipes/route.js.
 */
export async function GET() {
  try {
    const tags = await getTags();
    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
