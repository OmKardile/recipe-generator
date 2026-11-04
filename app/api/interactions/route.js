import { NextResponse } from 'next/server';
import { listInteractions, recordInteractions, clearInteractions } from '@/lib/interactionStore';
import { deriveLearnedProfile, filterLearnedByRestrictions } from '@/lib/personalization';
import { getHousehold } from '@/lib/householdStore';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Behavioural interaction tracking + learned taste profile.
 *
 *   POST   → record one event or a small batch  {type, ...} | {events: [...]}
 *   GET    → derived learned profile (explicit restrictions applied as a filter)
 *   DELETE → reset learning (household preferences are NOT touched)
 */

export async function POST(request) {
  try {
    const ip = clientIp(request);
    if (!rateLimit(`interactions:${ip}`, 60, 60_000)) {
      return NextResponse.json({ error: 'Too many events. Please slow down.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }

    const rawEvents = Array.isArray(body.events) ? body.events : [body];
    if (!rawEvents.length) {
      return NextResponse.json({ error: 'No interaction events provided.' }, { status: 400 });
    }

    const stored = await recordInteractions(rawEvents);
    if (!stored.length) {
      return NextResponse.json({ error: 'No valid interaction events provided.' }, { status: 400 });
    }
    return NextResponse.json({ recorded: stored.length });
  } catch (error) {
    console.error('Error recording interaction:', error?.message || error);
    return NextResponse.json({ error: 'Could not record interaction.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [events, household] = await Promise.all([listInteractions(), getHousehold()]);
    const raw = deriveLearnedProfile(events);
    const profile = filterLearnedByRestrictions(raw, {
      diet: household.diet,
      customDiet: household.customDiet,
      allergies: household.allergies,
      dislikes: household.dislikes,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error deriving profile:', error?.message || error);
    return NextResponse.json({ error: 'Could not load learned preferences.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearInteractions();
    return NextResponse.json({ reset: true });
  } catch (error) {
    console.error('Error resetting interactions:', error?.message || error);
    return NextResponse.json({ error: 'Could not reset learned preferences.' }, { status: 500 });
  }
}
