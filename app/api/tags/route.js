import { NextResponse } from 'next/server';
import { getTags, addTag } from '@/lib/dataStore';

export async function GET() {
  try {
    const tags = await getTags();
    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { tag } = await request.json();
    const tags = await addTag(tag);
    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error adding tag:', error);
    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 });
  }
}
