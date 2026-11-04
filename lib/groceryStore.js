import fs from 'fs/promises';
import path from 'path';
import { buildGroceryRequirement, mergeWithPreviousList, computeCostSummary } from './grocery.js';
import { getPlan } from './mealPlanStore.js';
import { getPantry } from './pantryStore.js';
import { getHousehold } from './householdStore.js';
import { getShoppingLocation } from './shoppingLocationStore.js';
import { getRetailerProvider } from './retailers/index.js';
import { listProducts } from './retailerProducts.js';
import { matchIngredient, pickDefaultCandidate, aliasFamily } from './productMatching.js';

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

const cleanStr = (v, max = 80) =>
  typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';

/**
 * Regenerate the grocery list from a meal plan.
 * - pantry is subtracted automatically,
 * - purchased state / custom items / manual prices / selected products
 *   survive,
 * - duplicates are impossible (items are keyed by ingredient+dimension),
 * - a single unambiguous user-verified retailer product is auto-attached
 *   (low-confidence or ambiguous matches are left for manual selection).
 */
export async function generateGroceryList(mealPlanId) {
  const plan = await getPlan(mealPlanId);
  if (!plan) throw new Error('Meal plan not found');

  const [pantry, household, previous, location] = await Promise.all([
    getPantry(),
    getHousehold(),
    getCurrentList(),
    getShoppingLocation(),
  ]);

  // Custom items are the user's own additions — they survive regeneration
  // regardless of which plan the list is built from. Plan-derived state
  // (purchased/price/product) only survives for the same plan.
  const previousItems = previous?.items || [];
  const carriedCustom = previousItems.filter((i) => i.custom);
  const previousPlanItems =
    previous?.mealPlanId === mealPlanId ? previousItems.filter((i) => !i.custom) : [];

  const { items: freshItems, warnings } = buildGroceryRequirement(plan, pantry);
  const items = mergeWithPreviousList(freshItems, previousPlanItems).concat(carriedCustom);

  // Re-attach prices from the persistent catalog.
  const catalog = await getPriceCatalog();
  for (const item of items) {
    if (item.custom) continue;
    const saved = catalog[priceKey(item)];
    if (Number.isFinite(Number(saved)) && Number(saved) > 0) {
      item.price = Math.round(Number(saved) * 100) / 100;
    }
  }

  // Auto-attach retailer products — only single, fresh, high-confidence
  // user-verified matches; everything else waits for explicit selection.
  const provider = getRetailerProvider(location.retailerId);
  if (provider) {
    const retailerCatalog = await listProducts({ retailerId: provider.id });
    const byCanonical = new Map();
    for (const p of retailerCatalog) {
      const list = byCanonical.get(p.canonical) || [];
      list.push(p);
      byCanonical.set(p.canonical, list);
    }
    for (const item of items) {
      if (item.custom || item.product || item.productCleared) continue;
      if (!(item.toBuyBase > 0)) continue;
      const familyEntries = aliasFamily(item.canonical).flatMap(
        (key) => byCanonical.get(key) || []
      );
      if (!familyEntries.length) continue;
      const matched = matchIngredient(item, { catalogEntries: familyEntries });
      const best = pickDefaultCandidate(matched);
      if (best) item.product = best;
    }
  }

  const list = {
    id: `grocery_${Date.now().toString(36)}`,
    mealPlanId,
    generatedAt: new Date().toISOString(),
    currency: household.currency || 'INR',
    items,
    warnings,
  };

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
    case 'selectProduct': {
      // Attach a validated retailer product snapshot to one grocery line.
      const item = findItem(list, mutation.id);
      const p = mutation.product;
      if (!item || !p || typeof p !== 'object' || !cleanStr(p.name, 100) || !(Number(p.packageBase) > 0)) {
        return null;
      }
      const price = Number(p.price);
      const mrp = Number(p.mrp);
      item.product = {
        catalogId: cleanStr(p.catalogId, 40) || null,
        retailerId: cleanStr(p.retailerId, 30) || 'dmart',
        name: cleanStr(p.name, 100),
        brand: cleanStr(p.brand, 60),
        packageAmount: Number(p.packageAmount),
        packageUnit: cleanStr(p.packageUnit, 20),
        packageBase: Number(p.packageBase),
        packageDim: cleanStr(p.packageDim, 20),
        price: Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : null,
        mrp: Number.isFinite(mrp) && mrp > 0 ? Math.round(mrp * 100) / 100 : null,
        priceSource: p.priceSource === 'ai-estimate' ? 'ai-estimate' : 'user-verified',
        availability: cleanStr(p.availability, 20) || 'unknown',
        pincodeEntered: cleanStr(p.pincodeEntered, 6) || null,
        verifiedAt:
          typeof p.verifiedAt === 'string' && !Number.isNaN(Date.parse(p.verifiedAt))
            ? p.verifiedAt
            : new Date().toISOString(),
        url: cleanStr(p.url, 300).startsWith('https://') ? cleanStr(p.url, 300) : null,
        searchTerm: cleanStr(p.searchTerm, 60),
        confidence: Number.isFinite(Number(p.confidence)) ? Number(p.confidence) : null,
        autoSelected: false,
      };
      item.productCleared = false;
      break;
    }
    case 'clearProduct': {
      const item = findItem(list, mutation.id);
      if (!item) return null;
      item.product = null;
      item.productCleared = true;
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
