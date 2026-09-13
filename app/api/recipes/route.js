import { NextResponse } from 'next/server';
import { storeRecipe } from '@/lib/sharedStore';

export async function POST(request) {
  try {
    const { title, recipe, nutrition, ingredients, preferences } = await request.json();

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe content is required' },
        { status: 400 }
      );
    }

    const stored = storeRecipe({ title, recipe, nutrition, ingredients, preferences });

    return NextResponse.json({
      id: stored.id,
      url: `/recipe/${stored.id}`,
    });
  } catch (error) {
    console.error('Error storing recipe:', error);
    return NextResponse.json(
      { error: 'Failed to store recipe' },
      { status: 500 }
    );
  }
}
