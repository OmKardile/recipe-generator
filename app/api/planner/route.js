import { NextResponse } from 'next/server';
import { getModel, recipeGenerationConfig, MODEL_NAME } from '@/lib/gemini';
import { buildMealPlanPrompt } from '@/lib/mealPlanPrompts';
import { normalizeRecipe } from '@/lib/recipeUtils';
import { validateMealAgainstRestrictions } from '@/lib/restrictionCheck';
import { verifyVideoExists } from '@/lib/video';
import { getPantry } from '@/lib/pantryStore';
import { loadPersonalizationContext } from '@/lib/personalizationServer';
import { recordInteractions } from '@/lib/interactionStore';
import { analyzePlanQuality } from '@/lib/planInsights';
import {
  buildPlanSkeleton,
  applyGeneratedMeals,
  savePlan,
  duplicatePlan,
  generatePlanId,
  listPlans,
} from '@/lib/mealPlanStore';
import { rateLimit, clientIp, startGeneration, endGeneration } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const GENERATION_TIMEOUT_MS = 110_000;
const VALID_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
const WEEKDAY_OF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ─────────────────────────── request validation ─────────────────────────── */

function clampOpt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function validateConfig(raw) {
  if (!raw || typeof raw !== 'object') return { error: 'Config must be an object.' };

  const dayCount = parseInt(raw.dayCount, 10);
  if (!Number.isFinite(dayCount) || dayCount < 1 || dayCount > 14) {
    return { error: 'dayCount must be 1-14.' };
  }
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.startDate || ''))
    ? raw.startDate
    : new Date().toISOString().slice(0, 10);

  const mealSlots = Array.isArray(raw.mealSlots)
    ? raw.mealSlots.filter((s) => VALID_SLOTS.includes(s))
    : [];
  if (mealSlots.length === 0) return { error: 'Select at least one meal to plan.' };

  const cookDays = Array.isArray(raw.cookDays)
    ? raw.cookDays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    : null;

  return {
    dayCount,
    startDate,
    mealSlots,
    cookDays,
    maxPrepMinutes: clampOpt(raw.maxPrepMinutes, 5, 240, 20),
    maxCookMinutes: clampOpt(raw.maxCookMinutes, 5, 480, 45),
    leftoversAllowed: Boolean(raw.leftoversAllowed),
    name: typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : '',
  };
}

/* ─────────────────────────── AI response parsing ────────────────────────── */

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

/** Normalize + restriction-validate one raw AI meal; returns {recipe, warning?}. */
function validateMeal(rawMeal, restrictions) {
  const recipe = normalizeRecipe(rawMeal, 0);
  if (!recipe) return { recipe: null, warning: 'AI returned an unusable recipe' };

  const check = validateMealAgainstRestrictions(recipe, {
    diet: restrictions.diet,
    allergies: restrictions.allergies,
    dislikes: restrictions.dislikes,
  });
  if (!check.ok) {
    // Allergies/diet are non-negotiable: drop the meal, keep the plan honest.
    return { recipe: null, warning: `skipped "${recipe.title}" (${check.violations[0]})` };
  }
  return { recipe, warning: null };
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
    return { status: 500, message: 'The server has no GEMINI_API_KEY configured. Add it to .env.local and restart.' };
  }
  if (message.includes('PLAN_TIMEOUT')) {
    return { status: 504, message: 'The AI took too long to plan your week. Please try again.' };
  }
  if (error?.status === 429 || message.includes('429') || message.toLowerCase().includes('quota')) {
    return { status: 429, message: 'Gemini quota exceeded. Please wait a minute and try again.' };
  }
  if (error?.status === 503 || message.includes('503') || message.toLowerCase().includes('overloaded')) {
    return { status: 503, message: 'Gemini is overloaded right now. Please try again in a few seconds.' };
  }
  return { status: 500, message: 'Failed to generate the meal plan. Please try again.' };
}

/* ──────────────────────────────── POST ──────────────────────────────────── */

export async function POST(request) {
  try {
    const ip = clientIp(request);
    if (!rateLimit(`planner:${ip}`, 6, 60_000)) {
      return NextResponse.json({ error: 'Too many plan requests. Please wait a moment.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));

    // ── Duplicate an existing plan (no AI needed) ──
    if (body.duplicateOf) {
      const copy = await duplicatePlan(body.duplicateOf, body.startDate);
      if (!copy) return NextResponse.json({ error: 'Plan to duplicate not found.' }, { status: 404 });
      return NextResponse.json({ plan: copy });
    }

    // ── Generate a new plan ──
    const config = validateConfig(body);
    if (config.error) return NextResponse.json({ error: config.error }, { status: 400 });

    const genKey = `generate:${ip}`;
    if (!startGeneration(genKey)) {
      return NextResponse.json({ error: 'A plan is already being generated for you.' }, { status: 409 });
    }

    try {
      const [{ household, restrictions, learnedBlock }, pantry] = await Promise.all([
        loadPersonalizationContext(),
        getPantry(),
      ]);

      const skeleton = buildPlanSkeleton({
        startDate: config.startDate,
        dayCount: config.dayCount,
        cookDays: config.cookDays,
        mealSlots: config.mealSlots,
      });
      skeleton.days = skeleton.days.map((d) => ({
        ...d,
        weekday: WEEKDAY_OF[new Date(`${d.date}T00:00:00Z`).getUTCDay()],
      }));

      const prompt = buildMealPlanPrompt({
        household,
        config: {
          ...config,
          days: skeleton.days.map(({ date, cook, weekday }) => ({ date, cook, weekday })),
        },
        pantry,
        learnedBlock,
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
        return NextResponse.json(
          { error: 'The AI response could not be understood. Please try again.' },
          { status: 502 }
        );
      }

      // Normalize + validate every meal, then verify video ids.
      const generatedDays = await Promise.all(
        parsed.plan.days.map(async (day) => {
          const meals = {};
          for (const slot of config.mealSlots) {
            const rawMeal = day.meals?.[slot];
            if (!rawMeal) {
              meals[slot] = null;
              continue;
            }
            const { recipe, warning } = validateMeal(rawMeal, restrictions);
            if (!recipe) {
              meals[slot] = { recipe: null, warning };
              continue;
            }
            if (recipe.youtubeVideoId) {
              const valid = await verifyVideoExists(recipe.youtubeVideoId);
              if (!valid) recipe.youtubeVideoId = null;
            }
            meals[slot] = {
              recipe,
              servings: household.defaultServings,
              makesLeftovers: Boolean(rawMeal.makesLeftovers),
              leftoverNote: rawMeal.leftoverNote || null,
            };
          }
          return { date: String(day.date || '').slice(0, 10), meals };
        })
      );

      const { warnings } = applyGeneratedMeals(skeleton, generatedDays, { preserveLocked: false });

      const plan = {
        id: generatePlanId(),
        name: config.name || `Meal plan · ${skeleton.startDate}`,
        createdAt: new Date().toISOString(),
        startDate: skeleton.startDate,
        days: skeleton.days,
        mealSlots: config.mealSlots,
        configSnapshot: {
          maxPrepMinutes: config.maxPrepMinutes,
          maxCookMinutes: config.maxCookMinutes,
          leftoversAllowed: config.leftoversAllowed,
        },
        householdSnapshot: {
          adults: household.adults,
          children: household.children,
          defaultServings: household.defaultServings,
          diet: household.diet,
          allergies: household.allergies,
          dislikes: household.dislikes,
          currency: household.currency,
          weeklyBudget: household.weeklyBudget,
        },
        aiSummary: String(parsed.plan.summary || '').slice(0, 400),
        warnings: warnings.filter(Boolean),
        model: MODEL_NAME,
      };

      // Explainable plan-quality snapshot at generation time (PlannerView
      // recomputes live as the user edits meals).
      plan.insights = analyzePlanQuality({ plan, pantry, household });

      await savePlan(plan);

      // Behavioural signal: which dishes the plan OFFERED (exposure baseline;
      // cooking / feedback events are the real endorsements).
      const offered = [];
      for (const day of plan.days) {
        for (const [slot, meal] of Object.entries(day.meals || {})) {
          if (meal?.recipe) {
            offered.push({
              type: 'recipe_generated',
              title: meal.recipe.title,
              dishName: meal.recipe.dishName,
              cuisine: meal.recipe.cuisine,
              mealType: slot,
            });
          }
        }
      }
      recordInteractions(offered).catch(() => {}); // telemetry must never fail the plan

      return NextResponse.json({ plan });
    } finally {
      endGeneration(genKey);
    }
  } catch (error) {
    console.error('Error generating meal plan:', error?.message || error);
    const { status, message } = friendlyError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

/* ──────────────────────────────── GET ───────────────────────────────────── */

export async function GET() {
  try {
    const plans = await listPlans();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error listing plans:', error?.message || error);
    return NextResponse.json({ error: 'Failed to list meal plans.' }, { status: 500 });
  }
}
