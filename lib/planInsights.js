import { canonicalName } from './units.js';

/**
 * Plan-quality analytics — explainable, deterministic, heuristic.
 *
 * Everything here is PURE (client- and server-safe, no I/O) so the planner
 * route can snapshot insights at generation time and PlannerView can
 * recompute them live as the user edits the plan.
 *
 * Honesty rules (product-mandated):
 *   • The score is a PLAN-QUALITY heuristic (variety, effort, pantry fit,
 *     budget adherence) — never presented as an objective nutritional
 *     assessment. Nutrition inputs are AI estimates and are labelled as such.
 *   • Dimensions without data (no prices entered, no nutrition requested)
 *     score null and are excluded from the overall score — with an honest
 *     "not enough data" note instead of an invented number.
 */

const WEIGHTS = { variety: 0.25, budget: 0.2, pantry: 0.2, effort: 0.2, balance: 0.15 };

const clamp100 = (n) => Math.max(0, Math.min(100, Math.round(n)));
const round1 = (n) => Math.round(n * 10) / 10;

/** Flatten a plan into one record per planned meal. */
export function collectMeals(plan) {
  const meals = [];
  for (const day of plan?.days || []) {
    for (const [slot, meal] of Object.entries(day.meals || {})) {
      const r = meal?.recipe;
      if (!r) continue;
      const baseServings = r.servings || 1;
      const mealServings = meal.servings || baseServings;
      meals.push({
        date: day.date,
        slot,
        title: r.title || 'Recipe',
        dishName: r.dishName || r.title || '',
        cuisine: r.cuisine || '',
        minutes: (r.prepMinutes || 0) + (r.cookMinutes || 0),
        difficulty: r.difficulty || 'Medium',
        makesLeftovers: Boolean(meal.makesLeftovers),
        leftoverNote: meal.leftoverNote || null,
        servings: mealServings,
        servingFactor: mealServings / baseServings,
        nutrition: r.nutrition || null,
        ingredientNames: (r.ingredients || []).map((i) => i.name).filter(Boolean),
      });
    }
  }
  return meals;
}

/* ─────────────────────────── dimension scorers ─────────────────────────── */

function scoreVariety(meals) {
  if (!meals.length) return { score: null, explanation: 'No meals planned yet.', missingData: null };
  const dishNames = meals.map((m) => m.dishName.toLowerCase());
  const uniqueDishes = new Set(dishNames).size;
  const uniqueCuisines = new Set(meals.map((m) => m.cuisine.toLowerCase()).filter(Boolean)).size;

  const uniqueRatio = uniqueDishes / meals.length;
  const cuisineRatio = meals.length ? uniqueCuisines / meals.length : 0;
  const score = clamp100(100 * (0.65 * uniqueRatio + 0.35 * Math.max(cuisineRatio, uniqueRatio)));

  const dupes = new Map();
  for (const name of dishNames) dupes.set(name, (dupes.get(name) || 0) + 1);
  const repeated = [...dupes.entries()].filter(([, n]) => n > 1).map(([name]) => name);

  const explanation =
    `${uniqueDishes} different dish${uniqueDishes === 1 ? '' : 'es'} across ${meals.length} meals · ` +
    `${uniqueCuisines} cuisine${uniqueCuisines === 1 ? '' : 's'}` +
    (repeated.length ? ` · repeated: ${repeated.slice(0, 3).join(', ')}` : ' · no repeats');

  return { score, explanation, missingData: null, repeats: repeated };
}

function scorePantry(meals, pantry) {
  const required = new Set();
  for (const meal of meals) {
    for (const name of meal.ingredientNames) {
      const canonical = canonicalName(name);
      if (canonical) required.add(canonical);
    }
  }
  if (!required.size) return { score: null, explanation: 'No ingredients to match yet.', missingData: null };

  const stocked = new Set();
  for (const item of Array.isArray(pantry) ? pantry : []) {
    if (!item?.name || !(Number(item.quantity) > 0)) continue;
    stocked.add(canonicalName(item.name));
  }
  const covered = [...required].filter((r) => stocked.has(r));
  const score = clamp100((100 * covered.length) / required.size);
  const explanation = `Uses ${covered.length} of ${required.size} distinct ingredients you already stock`;
  return { score, explanation, missingData: null, covered };
}

function scoreEffort(meals, plan) {
  if (!meals.length) return { score: null, explanation: 'No meals planned yet.', missingData: null };
  const totalMinutes = meals.reduce((sum, m) => sum + m.minutes, 0);
  const avg = totalMinutes / meals.length;
  const limit = (plan?.configSnapshot?.maxPrepMinutes ?? 20) + (plan?.configSnapshot?.maxCookMinutes ?? 45);
  const hardCount = meals.filter((m) => m.difficulty === 'Hard').length;

  // Under the per-meal limit → full marks; over it decays linearly.
  const timeScore = Math.min(1, limit / Math.max(avg, 1));
  const score = clamp100(100 * timeScore - hardCount * 8);

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalText = hours ? `${hours}h ${mins}m` : `${mins}m`;
  const explanation =
    `${totalText} total kitchen time · ${Math.round(avg)} min average per meal · ` +
    `${hardCount} Hard recipe${hardCount === 1 ? '' : 's'} (limit ${limit} min/meal)`;

  const longest = [...meals].sort((a, b) => b.minutes - a.minutes)[0];
  return { score, explanation, missingData: null, longest };
}

function scoreBudget(cost) {
  const total = Number(cost?.total);
  const budget = Number(cost?.budget);
  if (!Number.isFinite(total) || !Number.isFinite(budget) || budget <= 0 || total <= 0) {
    return {
      score: null,
      explanation: 'Not scored yet',
      missingData: 'Enter prices in the Grocery tab to score budget adherence — we never invent prices.',
    };
  }
  const ratio = total / budget;
  const score = ratio <= 1 ? 100 : clamp100(100 / ratio);
  const pct = Math.round(ratio * 100);
  const explanation =
    ratio <= 1
      ? `Estimated ${Math.round(total)} of ${Math.round(budget)} budget (${pct}% used, from prices you entered)`
      : `Estimated ${Math.round(total)} — ${pct - 100}% over the ${Math.round(budget)} budget (from prices you entered)`;
  return { score, explanation, missingData: null };
}

function scoreBalance(meals) {
  const withNutrition = meals.filter((m) => m.nutrition && m.nutrition.calories > 0);
  if (withNutrition.length < Math.max(1, Math.ceil(meals.length / 2))) {
    return {
      score: null,
      explanation: 'Not scored yet',
      missingData: 'Ask for nutrition estimates when planning to score protein balance (AI estimates, clearly labelled).',
    };
  }

  const byDay = new Map();
  for (const m of withNutrition) {
    byDay.set(m.date, (byDay.get(m.date) || 0) + m.nutrition.calories * (m.servingFactor || 1));
  }
  const days = [...byDay.values()];
  const mean = days.reduce((a, b) => a + b, 0) / (days.length || 1);
  const spread =
    days.length > 1
      ? Math.sqrt(days.reduce((s, d) => s + (d - mean) ** 2, 0) / days.length) / (mean || 1)
      : 0;

  // A protein-forward meal (≥ 15 g protein/serving) on more days = better balance.
  const proteinDays = new Set(
    withNutrition.filter((m) => (m.nutrition.protein || 0) >= 15).map((m) => m.date)
  ).size;
  const cookDays = new Set(meals.map((m) => m.date)).size || 1;

  const proteinShare = proteinDays / cookDays;
  // Gentle penalty for wildly uneven daily calories (spread > 0.5).
  const spreadPenalty = Math.max(0, spread - 0.5) * 60;
  const score = clamp100(100 * proteinShare - spreadPenalty);

  const explanation =
    `Protein-forward meal (≥15 g protein/serving) on ${proteinDays} of ${cookDays} cooking days · ` +
    `~${Math.round(mean)} kcal/day average (AI estimates, not lab measurements)`;

  return { score, explanation, missingData: null };
}

/* ──────────────────────────── reuse detection ──────────────────────────── */

/** Ingredients used by ≥2 different meals — the "buy once, use thrice" list. */
export function detectIngredientReuse(meals) {
  const byIngredient = new Map();
  for (const meal of meals) {
    const seenInMeal = new Set();
    for (const name of meal.ingredientNames) {
      const canonical = canonicalName(name);
      if (!canonical || seenInMeal.has(canonical)) continue;
      seenInMeal.add(canonical);
      const entry = byIngredient.get(canonical) || { name, meals: new Set() };
      entry.meals.add(meal.title);
      byIngredient.set(canonical, entry);
    }
  }
  return [...byIngredient.values()]
    .filter((e) => e.meals.size >= 2)
    .sort((a, b) => b.meals.size - a.meals.size)
    .slice(0, 8)
    .map((e) => ({ name: e.name, meals: [...e.meals], count: e.meals.size }));
}

/** Pantry items close to expiry that this plan actually uses (≤3 days). */
function expiryMatches(meals, pantry, todayStr) {
  const required = new Set();
  for (const meal of meals) {
    for (const name of meal.ingredientNames) {
      const canonical = canonicalName(name);
      if (canonical) required.add(canonical);
    }
  }
  const today = new Date(`${todayStr}T00:00:00Z`).getTime();
  const matches = [];
  for (const item of Array.isArray(pantry) ? pantry : []) {
    if (!item?.expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate)) continue;
    const days = Math.round((new Date(`${item.expiryDate}T00:00:00Z`).getTime() - today) / 86400000);
    if (days < 0 || days > 3) continue;
    if (required.has(canonicalName(item.name))) {
      matches.push({ name: item.name, days, unit: item.unit, quantity: item.quantity });
    }
  }
  return matches.sort((a, b) => a.days - b.days);
}

/* ──────────────────────────────── entry point ───────────────────────────── */

/**
 * @param {object} args
 * @param {object} args.plan        meal-plan store object
 * @param {Array}  [args.pantry]    pantry items
 * @param {object} [args.household] saved household profile (budget)
 * @param {{total?: number, budget?: number}} [args.cost] grocery cost summary (priced items only)
 * @param {string} [args.todayStr]  ISO date for expiry math
 */
export function analyzePlanQuality({ plan, pantry = [], household = {}, cost = null, todayStr }) {
  const meals = collectMeals(plan);
  const today = todayStr || new Date().toISOString().slice(0, 10);

  const dims = {
    variety: scoreVariety(meals),
    budget: scoreBudget({ total: cost?.total ?? null, budget: cost?.budget ?? household?.weeklyBudget ?? null }),
    pantry: scorePantry(meals, pantry),
    effort: scoreEffort(meals, plan),
    balance: scoreBalance(meals),
  };

  const scored = Object.entries(dims).filter(([, d]) => d.score != null);
  const weightSum = scored.reduce((sum, [key]) => sum + WEIGHTS[key], 0);
  const overall = scored.length >= 2 && weightSum > 0
    ? clamp100(scored.reduce((sum, [key, d]) => sum + d.score * WEIGHTS[key], 0) / weightSum)
    : null;

  const reuse = detectIngredientReuse(meals);
  const leftovers = meals
    .filter((m) => m.makesLeftovers)
    .map((m) => ({ title: m.title, note: m.leftoverNote }));
  const expiring = expiryMatches(meals, pantry, today);

  const insights = [];
  if (reuse.length) {
    const names = reuse.slice(0, 4).map((r) => `${r.name} (${r.count}×)`);
    insights.push(`Buy once, use again: ${names.join(', ')} — shared across meals, so buy these in sensible bulk.`);
  }
  if (dims.variety.repeats?.length) {
    insights.push(`Repetition: ${dims.variety.repeats.slice(0, 3).join(', ')} appears more than once — lock variety by regenerating one of them.`);
  }
  if (leftovers.length) {
    insights.push(`${leftovers.length} dinner${leftovers.length === 1 ? '' : 's'} batch-cook extra (${leftovers.map((l) => l.title).slice(0, 2).join(', ')}) — plan the next day's lunch around them.`);
  }
  if (expiring.length) {
    const first = expiring[0];
    insights.push(`Uses ${first.name} before it expires (${first.days} day${first.days === 1 ? '' : 's'} left) — check the doneness/smell before using anything past its date.`);
  }
  if (dims.effort.longest && dims.effort.longest.minutes > 60) {
    insights.push(`Longest recipe: ${dims.effort.longest.title} (${dims.effort.longest.minutes} min) — schedule it on your freest day.`);
  }
  if (dims.pantry.covered && dims.pantry.covered.length) {
    const count = dims.pantry.covered.length;
    insights.push(`${count} ingredient${count === 1 ? '' : 's'} come straight from your pantry — the grocery list already nets them out.`);
  }

  return {
    overall,
    mealCount: meals.length,
    dimensions: Object.entries(dims).map(([key, d]) => ({
      key,
      label: key === 'pantry' ? 'Pantry fit' : key.charAt(0).toUpperCase() + key.slice(1),
      weight: WEIGHTS[key],
      ...d,
    })),
    ingredientReuse: reuse,
    leftovers,
    expiringUsed: expiring,
    insights,
    disclaimer:
      'Heuristic plan-quality score (variety, effort, pantry fit, budget) — not a nutritional assessment. Nutrition figures, where shown, are AI estimates.',
  };
}
