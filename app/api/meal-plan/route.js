import { NextResponse } from 'next/server';
import { getMealPlan, addToMealPlan, removeFromMealPlan } from '@/lib/dataStore';

export async function GET() {
  try {
    const plan = await getMealPlan();
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    return NextResponse.json({ error: 'Failed to fetch meal plan' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { day, meal, recipe } = await request.json();
    const plan = await addToMealPlan(day, meal, recipe);
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error adding to meal plan:', error);
    return NextResponse.json({ error: 'Failed to add to meal plan' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { day, meal } = await request.json();
    const plan = await removeFromMealPlan(day, meal);
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error removing from meal plan:', error);
    return NextResponse.json({ error: 'Failed to remove from meal plan' }, { status: 500 });
  }
}
