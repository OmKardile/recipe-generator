import { NextResponse } from 'next/server';
import { updateRecipe, deleteRecipe } from '@/lib/dataStore';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const recipes = await updateRecipe(id, body);
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }
    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deleteRecipe(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
