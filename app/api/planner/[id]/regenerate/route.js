import { NextResponse } from 'next/server';
import { getModel, recipeGenerationConfig, MODEL_NAME } from '@/lib/gemini';
import { buildMealPlanPrompt } from '@/lib/mealPlanPrompts';
import { normalizeRecipe } from '@/lib/recipeUtils';
import { validateMealAgainstRestrictions } from '@/lib/restrictionCheck';
import { verifyVideoExists } from '@/lib/video';
import { getHousehold } from '@/lib/householdStore';
import { getPantry } from '@/lib/pantryStore';
import { getPlan, savePlan } from '@/lib/mealPlanStore';
import { rateLimit, clientIp, startGeneration, endGeneration } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const GENERATION_TIMEOUT_MS = 110_000;

/**
 * POST /api/planner/[id]/regenerate  { scope: 'all' | 'day' | 'meal', date?, mealType? }
 *
 * Regeneration is SURGICAL by design:
 *   - scope 'all'  → refill every UNLOCKED slot (locked meals are preserved
 *                    verbatim and passed to the AI as fixed context),
 *   - scope 'day'  → refill only the requested day's unlocked slots,
 *   - scope 'meal' → refill exactly one slot.
 * The rest of the plan is never touched.
 */

function parsePlanJson(text) {
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

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('PLAN_TIMEOUT')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function friendlyError(error) {
  const message = `${error?.message || ''}`;
  if (error?.code === 'MISSING_GEMINI_API_KEY') {
    return { status: 500, message: 'The server has no GEMINI_API_KEY configured.' };
  }
  if (message.includes('PLAN_TIMEOUT')) {
    return { status: 504, message: 'The AI took too long. Please try again.' };
  }
  if (error?.status === 429 || message.includes('429')) {
    return { status: 429, message: 'Gemini quota exceeded. Please wait a minute.' };
  }
  return { status: 500, message: 'Failed to regenerate. Please try again.' };
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const ip = clientIp(request);
    if (!rateLimit(`planner:${ip}`, 6, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const scope = ['all', 'day', 'meal'].includes(body?.scope) ? body.scope : null;
    if (!scope) return NextResponse.json({ error: "scope must be 'all', 'day' or 'meal'." }, { status: 400 });
    if (scope !== 'all' && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.date || ''))) {
      return NextResponse.json({ error: 'A date (YYYY-MM-DD) is required for day/meal scope.' }, { status: 400 });
    }
    if (scope === 'meal' && !['breakfast', 'lunch', 'dinner', 'snack'].includes(body.mealType)) {
      return NextResponse.json({ error: 'mealType is required for meal scope.' }, { status: 400 });
    }

    const genKey = `regen:${id}:${ip}`;
    if (!startGeneration(genKey)) {
      return NextResponse.json({ error: 'This plan is already being regenerated.' }, { status: 409 });
    }

    try {
      const plan = await getPlan(id);
      if (!plan) return NextResponse.json({ error: 'Meal plan not found.' }, { status: 404 });

      const [household, pantry] = await Promise.all([getHousehold(), getPantry()]);

      // Determine which days get refilled.
      const refillDays =
        scope === 'all'
          ? plan.days.filter((d) => d.cook)
          : plan.days.filter((d) => d.date === body.date);

      // Locked meals in the refill range: preserved + passed as fixed context.
      const lockedMeals = [];
      for (const day of refillDays) {
        for (const [slot, meal] of Object.entries(day.meals || {})) {
          if (meal?.locked) lockedMeals.push({ date: day.date, mealType: slot, title: meal.recipe?.title });
        }
      }
      const lockedKeys = new Set(lockedMeals.map((m) => `${m.date}|${m.mealType}`));

      // Avoid repetition: every dish currently in the plan (minus refill targets)
      // becomes a "do not repeat" hint.
      const avoidDishNames = [];
      for (const day of plan.days) {
        for (const [slot, meal] of Object.entries(day.meals || {})) {
          if (meal?.recipe?.dishName && !lockedKeys.has(`${day.date}|${slot}`)) {
            avoidDishNames.push(meal.recipe.dishName);
          }
        }
      }

      const weekdayOf = (date) =>
        ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
          new Date(`${date}T00:00:00Z`).getUTCDay()
        ];

      const slotsForPrompt =
        scope === 'meal'
          ? [body.mealType]
          : plan.mealSlots || ['breakfast', 'lunch', 'dinner'];

      const prompt = buildMealPlanPrompt({
        household,
        config: {
          days: refillDays.map((d) => ({ date: d.date, weekday: weekdayOf(d.date), cook: true })),
          mealSlots: slotsForPrompt,
          maxPrepMinutes: plan.configSnapshot?.maxPrepMinutes ?? 20,
          maxCookMinutes: plan.configSnapshot?.maxCookMinutes ?? 45,
          leftoversAllowed: plan.configSnapshot?.leftoversAllowed ?? false,
        },
        pantry,
        recentDishNames: avoidDishNames,
        lockedMeals,
      });

      const model = getModel();
      const response = await withTimeout(
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { ...recipeGenerationConfig(), temperature: 0.8 },
        }),
        GENERATION_TIMEOUT_MS
      );
      const parsed = parsePlanJson((await response.response).text());
      if (!parsed?.plan?.days || !Array.isArray(parsed.plan.days)) {
        return NextResponse.json({ error: 'The AI response could not be understood. Please try again.' }, { status: 502 });
      }

      const warnings = [];
      const restrictions = {
        diet: household.diet === 'none' && household.customDiet ? household.customDiet : household.diet,
        allergies: household.allergies,
        dislikes: household.dislikes,
      };

      for (const genDay of parsed.plan.days) {
        const day = plan.days.find((d) => d.date === genDay.date);
        if (!day) continue;
        for (const slot of slotsForPrompt) {
          const key = `${day.date}|${slot}`;
          if (lockedKeys.has(key)) continue; // never touch locked meals
          if (scope === 'meal' && slot !== body.mealType) continue;

          const rawMeal = genDay.meals?.[slot];
          const previous = day.meals[slot];
          if (!rawMeal) {
            if (!previous?.locked) day.meals[slot] = null;
            continue;
          }

          const recipe = normalizeRecipe(rawMeal, 0);
          if (!recipe) {
            warnings.push(`${day.date} ${slot}: AI returned an unusable recipe — kept the previous meal`);
            continue;
          }
          const check = validateMealAgainstRestrictions(recipe, restrictions);
          if (!check.ok) {
            warnings.push(`${day.date} ${slot}: skipped "${recipe.title}" (${check.violations[0]}) — kept the previous meal`);
            continue;
          }
          if (recipe.youtubeVideoId && !(await verifyVideoExists(recipe.youtubeVideoId))) {
            recipe.youtubeVideoId = null;
          }
          day.meals[slot] = {
            recipe,
            locked: false,
            servings: previous?.servings || household.defaultServings,
            generatedAt: new Date().toISOString(),
            makesLeftovers: Boolean(rawMeal.makesLeftovers),
            leftoverNote: rawMeal.leftoverNote || null,
          };
        }
      }

      plan.warnings = warnings;
      plan.model = MODEL_NAME;
      plan.regeneratedAt = new Date().toISOString();
      await savePlan(plan);
      return NextResponse.json({ plan, warnings });
    } finally {
      endGeneration(genKey);
    }
  } catch (error) {
    console.error('Error regenerating plan:', error?.message || error);
    const { status, message } = friendlyError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
