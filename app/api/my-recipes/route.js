import { NextResponse } from 'next/server';
import { getRecipes } from '@/lib/dataStore';

/**
 * Read-only legacy endpoint. Saved recipes now live in the browser's
 * CacheStorage (lib/cacheStore.js); the client fetches this once, on a
 * fresh browser, to import anything the old server file store had
 * (local-dev `data/recipes.json`). Nothing writes here anymore — server
 * filesystems are read-only on most deploys, which is why saving broke.
 */
export async function GET() {
  try {
    const recipes = await getRecipes();
    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}
