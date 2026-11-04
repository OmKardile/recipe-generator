import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PLANS_FILE = path.join(DATA_DIR, 'mealplans.json');

/**
 * Meal-plan store — dated, generated plans with lockable meals.
 *
 * Shape (per plan):
 * {
 *   id, createdAt, startDate, days: [
 *     { date: 'YYYY-MM-DD', cook: true,
 *       meals: { breakfast: {recipe, locked, servings, cookedAt?}|null, ... } }
 *   ],
 *   householdSnapshot, configSnapshot, aiSummary, warnings: []
 * }
 *
 * "recipe" is a normalizeRecipe()-validated object (same shape the recipe
 * generator returns), so every downstream consumer — real-photo lookup,
 * serving scaling, markdown synthesis, cook mode — just works.
 */

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

const isoDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : null);

export function generatePlanId() {
  return `plan_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll() {
  try {
    const data = JSON.parse(await fs.readFile(PLANS_FILE, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAll(plans) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
}

export async function listPlans() {
  const plans = await readAll();
  return plans
    .map(({ days, ...meta }) => ({
      ...meta,
      dayCount: days?.length || 0,
      mealCount: days?.reduce(
        (n, d) => n + MEAL_SLOTS.filter((m) => d.meals?.[m]).length,
        0
      ) || 0,
    }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function getPlan(id) {
  const plans = await readAll();
  return plans.find((p) => p.id === id) || null;
}

export async function savePlan(plan) {
  const plans = await readAll();
  const index = plans.findIndex((p) => p.id === plan.id);
  if (index === -1) plans.unshift(plan);
  else plans[index] = plan;
  await writeAll(plans.slice(0, 60)); // keep the store bounded
  return plan;
}

export async function deletePlan(id) {
  const plans = (await readAll()).filter((p) => p.id !== id);
  await writeAll(plans);
  return plans;
}

/** Build the day scaffolding for a plan: dates, cook flags, empty slots. */
export function buildPlanSkeleton({ startDate, dayCount, cookDays, mealSlots }) {
  const start = isoDate(startDate) || new Date().toISOString().slice(0, 10);
  const startMs = new Date(`${start}T00:00:00Z`).getTime();
  const slots = Array.isArray(mealSlots) && mealSlots.length
    ? mealSlots.filter((m) => MEAL_SLOTS.includes(m))
    : ['breakfast', 'lunch', 'dinner'];

  const days = [];
  for (let i = 0; i < Math.min(Math.max(dayCount, 1), 14); i++) {
    const date = new Date(startMs + i * 86400000).toISOString().slice(0, 10);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0=Sun
    const cook = Array.isArray(cookDays) && cookDays.length
      ? cookDays.includes(weekday)
      : true;
    days.push({ date, cook, meals: {} });
  }
  return { startDate: start, days, mealSlots: slots };
}

/** Apply generated meals into a skeleton, honoring locks on replacement. */
export function applyGeneratedMeals(skeleton, generatedDays, { preserveLocked = false } = {}) {
  const warnings = [];
  for (const genDay of generatedDays || []) {
    const day = skeleton.days.find((d) => d.date === genDay.date);
    if (!day) continue;
    for (const slot of skeleton.mealSlots) {
      const meal = genDay.meals?.[slot];
      if (day.meals[slot]?.locked && preserveLocked) continue;
      if (meal && meal.recipe) {
        day.meals[slot] = {
          recipe: meal.recipe,
          locked: false,
          servings: meal.servings || day.meals[slot]?.servings || null,
          generatedAt: new Date().toISOString(),
        };
      } else if (meal === null && !day.meals[slot]?.locked) {
        day.meals[slot] = null; // requested slot the AI safely skipped (allergy etc.)
      }
      if (meal?.warning) warnings.push(`${genDay.date} ${slot}: ${meal.warning}`);
    }
  }
  return { plan: skeleton, warnings };
}

/** Duplicate a plan onto new dates starting at a given start date. */
export async function duplicatePlan(id, newStartDate) {
  const source = await getPlan(id);
  if (!source) return null;
  const start = isoDate(newStartDate) || source.startDate;
  const startMs = new Date(`${start}T00:00:00Z`).getTime();
  const copy = {
    ...JSON.parse(JSON.stringify(source)),
    id: generatePlanId(),
    createdAt: new Date().toISOString(),
    startDate: start,
    name: `${source.name || 'Meal plan'} (copy)`,
  };
  copy.days = source.days.map((day, i) => ({
    ...day,
    date: new Date(startMs + i * 86400000).toISOString().slice(0, 10),
    meals: Object.fromEntries(
      Object.entries(day.meals || {}).map(([slot, meal]) => [
        slot,
        meal ? { ...meal, cookedAt: null } : meal,
      ])
    ),
  }));
  return savePlan(copy);
}

/* ─────────────── surgical single-plan mutations (PATCH actions) ─────────── */

export async function mutatePlan(id, mutation) {
  const plan = await getPlan(id);
  if (!plan) return null;
  const { action } = mutation || {};

  const findDay = (date) => plan.days.find((d) => d.date === isoDate(date));

  switch (action) {
    case 'toggleLock': {
      const day = findDay(mutation.date);
      const meal = day?.meals?.[mutation.mealType];
      if (!meal) return null;
      meal.locked = !meal.locked;
      break;
    }
    case 'setServings': {
      const day = findDay(mutation.date);
      const meal = day?.meals?.[mutation.mealType];
      const n = parseInt(mutation.servings, 10);
      if (!meal || !Number.isFinite(n) || n < 1 || n > 24) return null;
      meal.servings = n;
      break;
    }
    case 'setDayCook': {
      const day = findDay(mutation.date);
      if (!day) return null;
      day.cook = Boolean(mutation.cook);
      break;
    }
    case 'setMeal': {
      // Manual placement of a saved/generated recipe into a slot.
      const day = findDay(mutation.date);
      if (!day || !MEAL_SLOTS.includes(mutation.mealType)) return null;
      const n = parseInt(mutation.servings, 10);
      day.meals[mutation.mealType] = {
        recipe: mutation.recipe,
        locked: Boolean(mutation.locked),
        servings: Number.isFinite(n) && n >= 1 ? Math.min(n, 24) : null,
        placedAt: new Date().toISOString(),
      };
      break;
    }
    case 'moveMeal': {
      const from = findDay(mutation.fromDate);
      const meal = from?.meals?.[mutation.fromMealType];
      const to = findDay(mutation.toDate);
      if (!meal || !to || !MEAL_SLOTS.includes(mutation.toMealType)) return null;
      from.meals[mutation.fromMealType] = null;
      to.meals[mutation.toMealType] = meal;
      break;
    }
    case 'clearMeal': {
      const day = findDay(mutation.date);
      if (!day) return null;
      day.meals[mutation.mealType] = null;
      break;
    }
    case 'markCooked': {
      const day = findDay(mutation.date);
      const meal = day?.meals?.[mutation.mealType];
      if (!meal) return null;
      meal.cookedAt = mutation.cooked ? new Date().toISOString() : null;
      break;
    }
    case 'rename': {
      plan.name = String(mutation.name || '').trim().slice(0, 80) || plan.name;
      break;
    }
    default:
      return null;
  }

  await savePlan(plan);
  return plan;
}

/** The plan covering today (prefers the most recently created). */
export async function getActivePlan(todayStr) {
  const today = isoDate(todayStr) || new Date().toISOString().slice(0, 10);
  const plans = await readAll();
  return (
    plans
      .filter((p) => p.days?.some((d) => d.date === today))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null
  );
}

export { MEAL_SLOTS };
