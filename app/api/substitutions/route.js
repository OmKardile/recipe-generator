import { NextResponse } from 'next/server';
import { getModel, recipeGenerationConfig } from '@/lib/gemini';
import { getSubstitutions } from '@/lib/substitutions';
import { ingredientViolatesRestrictions } from '@/lib/restrictionCheck';
import { getHousehold } from '@/lib/householdStore';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/substitutions  { ingredient: string, includeAi?: boolean }
 *
 * Curated swaps first (fast, offline, high-confidence). AI suggestions only
 * when the user asks for more (or the curated table has nothing) — parsed,
 * schema-validated and capped before anything reaches the client, and always
 * labelled source: 'ai'. The household's saved restrictions filter BOTH
 * sources server-side, so a vegan household is never offered paneer.
 */

const AI_TIMEOUT_MS = 20_000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('SUBSTITUTION_TIMEOUT')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Validate one raw AI option; returns null when it fails the contract. */
function normalizeAiOption(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const to = typeof raw.to === 'string' ? raw.to.replace(/[\r\n]+/g, ' ').trim().slice(0, 80) : '';
  if (!to) return null;

  const ratio = Number(raw.ratio);
  const safeRatio = Number.isFinite(ratio) && ratio > 0 && ratio <= 3
    ? Math.round(ratio * 100) / 100
    : 1;

  const text = (v) =>
    typeof v === 'string' && v.trim() ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, 220) : '';

  const option = {
    to,
    ratio: safeRatio,
    taste: text(raw.taste) || 'Not documented — taste as you go.',
    texture: text(raw.texture) || 'Not documented.',
    nutrition: text(raw.nutrition) || 'Not nutritionally identical to the original.',
    cooking: text(raw.cooking) || 'Use the same way as the original, adjusting to taste.',
    source: 'ai',
  };
  // All four notes must exist for the UI contract; empty ones get honest fillers.
  return option;
}

function buildAiPrompt(ingredient, restrictionsText, alreadySuggested) {
  return `You are "Chef Rani", a veteran Indian home-cooking expert. Suggest up to 3 practical substitutions for one ingredient, for real Indian home kitchens.

<ingredient>
${ingredient}
</ingredient>
${restrictionsText}
${alreadySuggested ? `<already_suggested>\nDo not repeat these: ${alreadySuggested.join(', ')}\n</already_suggested>\n` : ''}<rules>
- Only real, widely available Indian-market ingredients.
- "ratio" = multiply the original quantity by this number to get the substitute quantity (e.g. 1 for a 1:1 swap, 0.5 when dry rehydrated weight is half).
- Substitutions are NEVER nutritionally identical — say honestly how they differ.
- If an option fails a restriction listed above, do not suggest it.
</rules>

<output_contract>
Return ONE valid JSON object, nothing else — no markdown fences, no commentary. First character "{", last character "}".
{"options":[{"to":"ingredient name","ratio":1,"taste":"…","texture":"…","nutrition":"…","cooking":"…"}]}
</output_contract>

Remember: strict JSON only. Begin with { now.`;
}

function parseAiJson(text) {
  if (!text || typeof text !== 'string') return null;
  let candidate = text.trim();
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidate = fence[1].trim();
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last <= first) return null;
  try {
    return JSON.parse(candidate.slice(first, last + 1));
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const ip = clientIp(request);
    if (!rateLimit(`substitutions:${ip}`, 12, 60_000)) {
      return NextResponse.json({ error: 'Too many substitution lookups. Please wait a moment.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const ingredient =
      typeof body?.ingredient === 'string' ? body.ingredient.trim().slice(0, 80) : '';
    if (!ingredient) {
      return NextResponse.json({ error: 'An ingredient name is required.' }, { status: 400 });
    }

    // Household restrictions filter BOTH sources — hard rules, not hints.
    const household = await getHousehold();
    const restrictions = {
      diet: household.diet === 'none' && household.customDiet ? household.customDiet : household.diet,
      allergies: household.allergies || [],
      dislikes: household.dislikes || [],
    };
    const hasRestrictions = Boolean(
      (restrictions.diet && restrictions.diet !== 'none') ||
        restrictions.allergies.length ||
        restrictions.dislikes.length
    );

    const curated = getSubstitutions(ingredient, hasRestrictions ? restrictions : null);
    const options = [...curated];

    let aiError = null;
    const wantsAi = Boolean(body.includeAi) || curated.length === 0;
    if (wantsAi) {
      const restrictionsText = hasRestrictions
        ? `<restrictions>\nHard constraints from the household profile — every suggestion must respect them:\n- Diet: ${restrictions.diet}\n- Allergies (absolute): ${restrictions.allergies.join(', ') || 'none'}\n- Disliked ingredients (never suggest): ${restrictions.dislikes.join(', ') || 'none'}\n</restrictions>\n`
        : '';
      try {
        const model = getModel();
        const response = await withTimeout(
          model.generateContent({
            contents: [{ role: 'user', parts: [{ text: buildAiPrompt(ingredient, restrictionsText, curated.map((o) => o.to)) }] }],
            generationConfig: { ...recipeGenerationConfig(), temperature: 0.6 },
          }),
          AI_TIMEOUT_MS
        );
        const parsed = parseAiJson((await response.response).text());
        const aiOptions = (Array.isArray(parsed?.options) ? parsed.options : [])
          .map(normalizeAiOption)
          .filter(Boolean)
          .filter((o) => !hasRestrictions || !ingredientViolatesRestrictions(o.to, restrictions))
          .slice(0, 3);
        options.push(...aiOptions);
      } catch (error) {
        aiError = 'Chef Rani could not be reached — curated swaps are still available.';
        console.warn('[substitutions] AI fallback failed:', error?.message || error);
      }
    }

    return NextResponse.json({
      ingredient,
      options,
      restricted: hasRestrictions,
      aiError,
    });
  } catch (error) {
    console.error('Error fetching substitutions:', error?.message || error);
    return NextResponse.json({ error: 'Could not load substitutions.' }, { status: 500 });
  }
}
