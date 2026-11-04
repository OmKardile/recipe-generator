import fs from 'fs/promises';
import path from 'path';
import { buildGroceryRequirement, mergeWithPreviousList, computeCostSummary } from './grocery';
import { getPlan } from './mealPlanStore';
import { getPantry } from './pantryStore';
import { getHousehold } from './householdStore';

const DATA_DIR = path.join(process.cwd(), 'data');
const GROCERY_FILE = path.join(DATA_DIR, 'grocery.json');
const PRICES_FILE = path.join(DATA_DIR, 'prices.json');

/**
 * Grocery list store — one active list at a time, regenerated determin-
 * istically from the meal plan. Manual prices live in a separate reusable
 * catalog (prices.json) keyed by canonical ingredient + unit.
 */

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getCurrentList() {
  return readJson(GROCERY_FILE, null);
}

async function getPriceCatalog() {
  return readJson(PRICES_FILE, {});
}

/** Price key: canonical ingredient + display unit ("tomato|kg"). */
function priceKey(item) {
  return `${item.canonical || item.name.toLowerCase()}|${item.unit}`;
}

/**
 * Regenerate the grocery list from a meal plan.
 * - pantry is subtracted automatically,
 * - purchased state / custom items / manual prices survive,
 * - duplicates are impossible (items are keyed by ingredient+dimension).
 */
export async function generateGroceryList(mealPlanId) {
  const plan = await getPlan(mealPlanId);
  if (!plan) throw new Error('Meal plan not found');

  const [pantry, household, previous] = await Promise.all([
    getPantry(),
    getHousehold(),
    getCurrentList(),
  ]);
  const previousForSamePlan = previous?.mealPlanId === mealPlanId ? previous.items : [];
  const carriedCustom =
    previous?.mealPlanId === mealPlanId ? [] : (previous?.items || []).filter((i) => i.custom);

  const { items: freshItems, warnings } = buildGroceryRequirement(plan, pantry);
  const items = [...mergeWithPreviousList(freshItems, previousForSamePlan), ...carriedCustom];

  // Re-attach prices from the persistent catalog.
  const catalog = await getPriceCatalog();
  for (const item of items) {
    if (item.custom) continue;
    const saved = catalog[priceKey(item)];
    if (Number.isFinite(Number(saved)) && Number(saved) > 0) {
      item.price = Math.round(Number(saved) * 100) / 100;
    }
  }

  const list = {
    id: `grocery_${Date.now().toString(36)}`,
    mealPlanId,
    generatedAt: new Date().toISOString(),
    currency: household.currency || 'INR',
    items: items.filter((i) => !i.custom),
    warnings,
  };
  // Custom items ride along outside the deterministic set.
  list.items = list.items.concat(carriedCustom.map((c) => ({ ...c, custom: true })));

  await writeJson(GROCERY_FILE, list);
  return { list, summary: computeCostSummary(list.items, household) };
}

const findItem = (list, id) => list.items.find((i) => i.id === id);

/** Apply a user mutation to the current list. */
export async function mutateGroceryList(mutation) {
  const list = await getCurrentList();
  if (!list) return null;
  const { action } = mutation || {};

  switch (action) {
    case 'togglePurchased': {
      const item = findItem(list, mutation.id);
      if (!item) return null;
      item.purchased = !item.purchased;
      break;
    }
    case 'updateItem': {
      const item = findItem(list, mutation.id);
      if (!item) return null;
      const fields = mutation.fields || {};
      if (Number.isFinite(Number(fields.toBuyAmount)) && Number(fields.toBuyAmount) >= 0) {
        item.toBuyAmount = Math.round(Number(fields.toBuyAmount) * 100) / 100;
        item.toBuyText = `${item.toBuyAmount} ${item.unit}`;
        item.edited = true;
      }
      if (typeof fields.unit === 'string' && fields.unit.trim()) {
        item.unit = fields.unit.trim().slice(0, 20);
        item.edited = true;
      }
      if (typeof fields.note === 'string') item.note = fields.note.trim().slice(0, 120) || null;
      if (typeof fields.category === 'string' && fields.category) item.category = fields.category;
      break;
    }
    case 'setPrice': {
      // Persist into the reusable catalog AND the current line.
      const item = findItem(list, mutation.id);
      if (!item) return null;
      const price = Number(mutation.price);
      item.price = Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : null;
      const catalog = await getPriceCatalog();
      if (item.price != null) catalog[priceKey(item)] = item.price;
      else delete catalog[priceKey(item)];
      await writeJson(PRICES_FILE, catalog);
      break;
    }
    case 'addCustom': {
      const name = String(mutation.name || '').trim().slice(0, 80);
      if (!name) return null;
      const qty = Number(mutation.quantity);
      list.items.push({
        id: `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        canonical: name.toLowerCase(),
        name,
        category: mutation.category || 'other',
        dim: null,
        unit: String(mutation.unit || 'piece').slice(0, 20),
        requiredText: 'custom',
        pantryText: '—',
        toBuyText: `${Number.isFinite(qty) && qty > 0 ? qty : 1} ${mutation.unit || 'piece'}`,
        toBuyAmount: Number.isFinite(qty) && qty > 0 ? qty : 1,
        purchased: false,
        custom: true,
        price: Number.isFinite(Number(mutation.price)) && mutation.price > 0 ? mutation.price : null,
        note: String(mutation.note || '').slice(0, 120) || null,
      });
      break;
    }
    case 'removeItem': {
      list.items = list.items.filter((i) => i.id !== mutation.id);
      break;
    }
    case 'clearPurchased': {
      // Keep unpurchased items and custom items; drop purchased ones.
      list.items = list.items.filter((i) => !i.purchased);
      break;
    }
    default:
      return null;
  }

  await writeJson(GROCERY_FILE, list);
  const household = await getHousehold();
  return { list, summary: computeCostSummary(list.items, household) };
}

/** Mark-to-pantry: add purchased items into the pantry after shopping. */
export async function purchasedItemsToPantryLines() {
  const list = await getCurrentList();
  if (!list) return [];
  return list.items
    .filter((i) => i.purchased && i.toBuyAmount > 0)
    .map((i) => ({
      name: i.name,
      quantity: i.toBuyAmount,
      unit: normalizeUnitSafe(i.unit),
      category: i.category,
    }));
}

function normalizeUnitSafe(unit) {
  return String(unit || 'piece').trim().toLowerCase() || 'piece';
}
