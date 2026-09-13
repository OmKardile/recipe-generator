import { NextResponse } from 'next/server';
import { getRecipes, addRecipe } from '@/lib/dataStore';

export async function GET() {
  try {
    const recipes = await getRecipes();
    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const recipe = await addRecipe(body);
    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error adding recipe:', error);
    return NextResponse.json({ error: 'Failed to add recipe' }, { status: 500 });
  }
}
