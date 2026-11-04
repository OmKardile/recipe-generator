import {
  aggregateIngredients,
  canonicalName,
  formatBase,
  displayUnitFor,
  fromBase,
  normalizeUnit,
  unitDef,
} from './units.js';

/**
 * Grocery intelligence — deterministic aggregation from a meal plan.
 *
 * NEVER calls an AI, never fabricates prices. The pipeline:
 *   plan meals → scale ingredients to meal servings → normalize units →
 *   merge compatible units per ingredient → subtract pantry availability →
 *   categorize → attach manual prices (user-entered only).
 *
 * Pure logic lives here; persistence lives in groceryStore.js.
 */

/* ───────────────────────── 9-category taxonomy ─────────────────────────── */

const CATEGORY_RULES = [
  {
    key: 'meat',
    label: 'Meat & Seafood',
    keywords: ['chicken', 'mutton', 'lamb', 'beef', 'pork', 'fish', 'prawn', 'shrimp', 'crab', 'lobster', 'salmon', 'tuna', 'mince', 'keema', 'bacon', 'sausage', 'egg', 'eggs'],
  },
  {
    key: 'dairy',
    label: 'Dairy & Alternatives',
    keywords: ['milk', 'paneer', 'cottage cheese', 'yogurt', 'yoghurt', 'curd', 'cream', 'cheese', 'butter', 'ghee', 'khoya', 'mawa', 'malai', 'tofu', 'soy milk', 'oat milk', 'almond milk', 'buttermilk', 'lassi', ' condensed'],
  },
  {
    key: 'produce',
    label: 'Vegetables & Fruits',
    keywords: ['onion', 'tomato', 'ginger', 'garlic', 'green chilli', 'green chili', 'chilli', 'potato', 'spinach', 'palak', 'coriander', 'cilantro', 'mint', 'lemon', 'lime', 'peas', 'capsicum', 'bell pepper', 'carrot', 'beans', 'cauliflower', 'gobi', 'cucumber', 'cabbage', 'brinjal', 'eggplant', 'okra', 'bhindi', 'methi', 'fenugreek leaf', 'banana', 'apple', 'mango', 'orange', 'grapes', 'pomegranate', 'spring onion', 'shallot', 'beetroot', 'radish', 'pumpkin', 'ash gourd', 'bottle gourd', 'lauki', 'ridge gourd', 'colocasia', 'arbi', 'yam', 'raw banana', 'drumstick', 'cluster bean', 'avocado', 'strawberry', 'watermelon', 'papaya', 'guava', 'sweet potato'],
  },
  {
    key: 'bakery',
    label: 'Bakery',
    keywords: ['bread', 'bun', 'pav', 'croissant', 'baguette', 'bagel', 'muffin', 'cake', 'pastry', 'cookie', 'rusk', 'tortilla', ' breadcrumbs'],
  },
  {
    key: 'frozen',
    label: 'Frozen Products',
    keywords: ['frozen', 'ice cream', 'fries', 'frozen peas', 'nuggets', 'frozen corn'],
  },
  {
    key: 'beverages',
    label: 'Beverages',
    keywords: ['tea', 'coffee', 'juice', 'soda', 'soft drink', 'cola', 'sparkling water', 'mineral water', 'green tea', 'herbal tea', 'coconut water', 'cordial', 'wine', 'beer'],
  },
  {
    key: 'grains',
    label: 'Grains & Cereals',
    keywords: ['rice', 'basmati', 'atta', 'flour', 'maida', 'sooji', 'semolina', 'poha', 'flattened rice', 'dal', 'lentil', 'toor', 'moong', 'masoor', 'chana', 'chickpea', 'rajma', 'kidney bean', 'besan', 'oat', 'noodle', 'pasta', 'macaroni', 'vermicelli', 'quinoa', 'millet', 'jowar', 'bajra', 'ragi', 'corn', 'sago', 'sabudana', 'couscous', 'wheat', 'barley', 'popcorn', 'cereal', 'muesli', ' bread'],
  },
  {
    key: 'spices',
    label: 'Spices & Seasoning',
    keywords: ['turmeric', 'haldi', 'cumin', 'jeera', 'mustard seed', 'rai', 'coriander powder', 'garam masala', 'cardamom', 'elaichi', 'cinnamon', 'dalchini', 'clove', 'lavang', 'bay leaf', 'pepper', 'fenugreek', 'kasuri', 'amchur', 'mango powder', 'chaat masala', 'asafoetida', 'hing', 'curry leaf', 'kashmiri', 'paprika', 'five spice', 'soy sauce', 'vinegar', 'salt', 'schezwan', 'chilli powder', 'chili powder', 'masala', 'ajwain', 'carom', 'fennel', 'saunf', 'star anise', 'nutmeg', 'mace', 'javitri', 'kewra', 'rose water', 'saffron', 'kesar', 'tamarind', 'imli', 'sesame', 'til', 'sugar', 'jaggery', 'honey', 'oil', 'baking powder', 'baking soda', 'yeast', 'cornflour', 'corn starch', 'essence', 'vanilla', 'cocoa', 'chocolate'],
  },
];

export const GROCERY_CATEGORIES = [
  ...CATEGORY_RULES.map(({ key, label }) => ({ key, label })),
  { key: 'other', label: 'Other Essentials' },
];

export function categorizeGroceryItem(name) {
  const lower = ` ${String(name || '').toLowerCase()} `;
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.key;
  }
  return 'other';
}

/* ─────────────────────── plan → aggregated requirement ─────────────────── */

/**
 * Collect every ingredient line from a plan, scaled to each meal's servings.
 * @returns {Array<{name, amount, unit, note}>}
 */
export function planIngredientLines(plan) {
  const lines = [];
  for (const day of plan?.days || []) {
    for (const [slot, meal] of Object.entries(day.meals || {})) {
      if (!meal?.recipe?.ingredients?.length) continue;
      const baseServings = meal.recipe.servings || meal.servings || 1;
      const mealServings = meal.servings || baseServings;
      const factor = mealServings / baseServings;
      for (const ing of meal.recipe.ingredients) {
        if (!ing?.name) continue;
        lines.push({
          name: ing.name,
          amount: Number(ing.amount) * (Number.isFinite(factor) ? factor : 1),
          unit: ing.unit || '',
          note: ing.note || null,
        });
      }
    }
  }
  return lines;
}

/**
 * Build the aggregated grocery requirement from a plan, minus pantry stock.
 *
 * @param {object} plan meal-plan store object
 * @param {Array} pantry pantry items
 * @returns {{items: Array, warnings: string[]}}
 */
export function buildGroceryRequirement(plan, pantry = []) {
  const warnings = [];
  const buckets = aggregateIngredients(planIngredientLines(plan));

  // Pantry availability per canonical name, per dimension.
  const pantryByCanonical = new Map();
  for (const item of Array.isArray(pantry) ? pantry : []) {
    if (!item?.name) continue;
    const def = unitDef(item.unit);
    const qty = Number(item.quantity);
    if (!def || !Number.isFinite(qty) || qty <= 0) {
      pantryByCanonical.set(`${canonicalName(item.name)}|unavailable`, item);
      continue;
    }
    const key = `${canonicalName(item.name)}|${def.dim}`;
    const existing = pantryByCanonical.get(key);
    pantryByCanonical.set(
      key,
      existing ? { ...existing, base: existing.base + qty * def.base } : { ...item, base: qty * def.base }
    );
  }

  const items = [];
  for (const [key, bucket] of buckets) {
    const canonical = bucket.canonical;
    const requiredBase = bucket.base;
    const pantryEntry =
      requiredBase != null ? pantryByCanonical.get(`${canonical}|${bucket.dim}`) : undefined;

    let pantryBase = 0;
    let toBuyBase = requiredBase;
    if (requiredBase != null && pantryEntry) {
      pantryBase = pantryEntry.base;
      toBuyBase = Math.max(0, requiredBase - pantryBase);
    } else if (requiredBase != null) {
      // The pantry holds this ingredient in an incompatible form (different
      // unit family or an unknown unit) — say so instead of silently
      // ignoring it or guessing a conversion.
      for (const [pKey, pItem] of pantryByCanonical) {
        if (pKey.startsWith(`${canonical}|`) && pKey !== `${canonical}|${bucket.dim}` && pItem.quantity > 0) {
          warnings.push(
            `Pantry has ${pItem.name} but in ${pItem.unit || 'an incompatible unit'} — not combined with ${bucket.displayName}`
          );
          break;
        }
      }
    }

    const displayUnit = requiredBase != null ? displayUnitFor(requiredBase, bucket.dim) : bucket.unit;
    items.push({
      id: `gro_${canonical.replace(/[^a-z0-9]+/g, '_')}_${bucket.dim || bucket.unit}`,
      canonical,
      name: bucket.displayName,
      category: categorizeGroceryItem(bucket.displayName),
      dim: bucket.dim,
      unit: displayUnit,
      requiredBase: requiredBase != null ? Math.round(requiredBase * 100) / 100 : null,
      pantryBase: pantryBase ? Math.round(pantryBase * 100) / 100 : 0,
      toBuyBase: toBuyBase != null ? Math.round(toBuyBase * 100) / 100 : null,
      requiredText: requiredBase != null ? formatBase(requiredBase, bucket.dim) : `${Math.round(bucket.rawAmount * 100) / 100} ${bucket.unit}`,
      pantryText: pantryBase ? formatBase(pantryBase, bucket.dim) : '—',
      toBuyText:
        toBuyBase != null
          ? toBuyBase === 0
            ? '0 (in pantry)'
            : formatBase(toBuyBase, bucket.dim)
          : `${Math.round(bucket.rawAmount * 100) / 100} ${bucket.unit}`,
      toBuyAmount: requiredBase != null ? fromBase(toBuyBase, displayUnit) : Math.round(bucket.rawAmount * 100) / 100,
      notes: [...bucket.notes],
      purchased: false,
      custom: false,
      price: null,
    });
  }

  items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return { items, warnings };
}

/** Estimated cost math — manual prices ONLY, never fabricated. */
export function computeCostSummary(items, { weeklyBudget }) {
  let priced = 0;
  let total = 0;
  const expensive = [];
  for (const item of items || []) {
    if (item.custom) continue;
    if (Number.isFinite(Number(item.price)) && Number(item.price) > 0) {
      const lineCost = Number(item.price) * (Number(item.toBuyAmount) || 1);
      total += lineCost;
      priced += 1;
      expensive.push({ name: item.name, cost: Math.round(lineCost * 100) / 100 });
    }
  }
  expensive.sort((a, b) => b.cost - a.cost);
  return {
    total: Math.round(total * 100) / 100,
    pricedCount: priced,
    unpricedCount: (items || []).filter((i) => !i.custom).length - priced,
    budget: Number.isFinite(Number(weeklyBudget)) ? Number(weeklyBudget) : null,
    overBudget: Number.isFinite(Number(weeklyBudget)) && weeklyBudget > 0 && total > weeklyBudget,
    topExpensive: expensive.slice(0, 3),
  };
}

/** Merge a freshly computed list into a previous one, preserving user state. */
export function mergeWithPreviousList(freshItems, previousItems) {
  const prevById = new Map((previousItems || []).map((i) => [i.id, i]));
  const merged = freshItems.map((fresh) => {
    const prev = prevById.get(fresh.id);
    if (!prev) return fresh;
    return {
      ...fresh,
      // Purchased state survives only while the item is still needed.
      purchased: fresh.toBuyBase === 0 ? false : Boolean(prev.purchased),
      // User-entered price, note and selected retailer product survive
      // regeneration — the user's curation outlives plan edits.
      price: prev.price ?? null,
      note: prev.note || null,
      product: prev.product || null,
      // A product the user explicitly REMOVED stays removed: regeneration
      // must not silently re-attach an auto-selected product.
      productCleared: Boolean(prev.productCleared),
    };
  });
  // Custom user-added items carry over untouched.
  const customItems = (previousItems || []).filter((i) => i.custom);
  return [...merged, ...customItems];
}
