import { NextResponse } from 'next/server';
import { updatePantryItem, deletePantryItem } from '@/lib/pantryStore';

export const dynamic = 'force-dynamic';

/** PATCH /api/pantry/[id] — update name/quantity/unit/category/dates/storage. */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const item = await updatePantryItem(id, body);
    if (!item) return NextResponse.json({ error: 'Pantry item not found.' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error updating pantry item:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update pantry item.' },
      { status: 400 }
    );
  }
}

/** DELETE /api/pantry/[id] */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const items = await deletePantryItem(id);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error deleting pantry item:', error?.message || error);
    return NextResponse.json({ error: 'Failed to delete pantry item.' }, { status: 500 });
  }
}
