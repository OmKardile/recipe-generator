import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HOUSEHOLD_FILE = path.join(DATA_DIR, 'household.json');

/**
 * Household preferences store (JSON-file persistence, same pattern as
 * dataStore.js). Owner-keyed so a future auth layer can scope records per
 * user without schema surgery — today this deployment is single-user.
 */

const DEFAULT_HOUSEHOLD = {
  adults: 2,
  children: 0,
  defaultServings: 2,
  diet: 'none',
  customDiet: '',
  allergies: [],
  dislikes: [],
  cuisines: '',
  skillLevel: 'beginner',
  equipment: '',
  dailyCookMinutes: 45,
  weeklyBudget: null,
  currency: 'INR',
  region: '',
};

const clampInt = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const cleanString = (v, max = 300) =>
  typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';

const cleanList = (v, max = 20) =>
  Array.isArray(v)
    ? v.map((s) => cleanString(s, 60)).filter(Boolean).slice(0, max)
    : [];

const CURRENCIES = new Set(['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'SGD']);
const DIETS = new Set([
  'none', 'vegetarian', 'vegan', 'eggetarian', 'pescatarian', 'keto',
  'mediterranean', 'high protein', 'low carbohydrate', 'gluten free',
  'dairy free', 'indian vegetarian',
]);

/** Validate + normalize a household payload. Throws on invalid. */
export function normalizeHousehold(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Household must be an object.');

  const diet = DIETS.has(String(raw.diet || '').toLowerCase())
    ? String(raw.diet).toLowerCase()
    : 'none';

  const budget = Number(raw.weeklyBudget);
  const servings = clampInt(raw.defaultServings, 1, 20, null);
  const defaultServings =
    servings ?? clampInt(raw.adults, 1, 20, 2) + clampInt(raw.children, 0, 20, 0);

  const currency = CURRENCIES.has(String(raw.currency || '').toUpperCase())
    ? String(raw.currency).toUpperCase()
    : 'INR';

  return {
    ...DEFAULT_HOUSEHOLD,
    adults: clampInt(raw.adults, 1, 20, 2),
    children: clampInt(raw.children, 0, 20, 0),
    defaultServings,
    diet,
    customDiet: cleanString(raw.customDiet, 120),
    allergies: cleanList(raw.allergies),
    dislikes: cleanList(raw.dislikes, 40),
    cuisines: cleanString(raw.cuisines, 200),
    skillLevel: ['beginner', 'intermediate', 'advanced'].includes(raw.skillLevel)
      ? raw.skillLevel
      : 'beginner',
    equipment: cleanString(raw.equipment, 200),
    dailyCookMinutes: clampInt(raw.dailyCookMinutes, 10, 600, 45),
    weeklyBudget: Number.isFinite(budget) && budget > 0 ? Math.min(budget, 1_000_000) : null,
    currency,
    region: cleanString(raw.region, 80),
    updatedAt: new Date().toISOString(),
  };
}

export async function getHousehold() {
  try {
    const data = JSON.parse(await fs.readFile(HOUSEHOLD_FILE, 'utf-8'));
    return { ...DEFAULT_HOUSEHOLD, ...data };
  } catch {
    return { ...DEFAULT_HOUSEHOLD };
  }
}

export async function saveHousehold(raw) {
  const normalized = normalizeHousehold(raw);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(HOUSEHOLD_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}
