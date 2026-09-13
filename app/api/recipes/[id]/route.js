import { NextResponse } from 'next/server';
import { getRecipe } from '@/lib/sharedStore';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const recipe = getRecipe(id);

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error retrieving recipe:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve recipe' },
      { status: 500 }
    );
  }
}
