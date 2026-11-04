import { formatBase } from './units.js'

/**
 * Ingredient-to-product matching engine.
 *
 * A recipe ingredient and a supermarket product have DIFFERENT names:
 * tomato → "Fresh Tomatoes", wheat flour → "Atta", chickpeas → "Kabuli
 * Chana", cumin → "Jeera". This module owns that translation plus the
 * deterministic package math (optimizer, cart estimate).
 *
 * Honesty rules baked in:
 *   • confidence is scored and low-confidence matches are never
 *     auto-selected — ambiguous products always need explicit approval;
 *   • AI-estimate prices cap at low confidence and are always labeled;
 *   • package math never modifies recipe quantities — it only reports the
 *     rounding difference between what a recipe needs and what a package
 *     size actually delivers.
 *
 * Pure functions — unit-testable (tests/matching.test.js).
 */

/* ───────────────── supermarket alias knowledge base ──────────────────── */
/* Keys are canonicalName() outputs; several keys may share one entry object
   (that shared identity defines an alias FAMILY — "wheat flour" and "atta"
   are the same grocery item). terms = DMart-Ready-searchable phrasings.    */

const SUPERMARKET_ALIASES = {
  // Vegetables
  tomato: { terms: ['fresh tomatoes', 'tomato'] },
  onion: { terms: ['fresh onions', 'onion'] },
  potato: { terms: ['fresh potatoes', 'potato'] },
  ginger: { terms: ['fresh ginger', 'ginger'] },
  garlic: { terms: ['fresh garlic', 'garlic'] },
  'green chilli': { terms: ['green chilli', 'fresh green chillies'] },
  'green chili': { terms: ['green chilli', 'fresh green chillies'] },
  'green chilly': { terms: ['green chilli', 'fresh green chillies'] },
  capsicum: { terms: ['capsicum', 'bell pepper'] },
  'bell pepper': { terms: ['capsicum', 'bell pepper'] },
  carrot: { terms: ['fresh carrots', 'carrot'] },
  bean: { terms: ['fresh beans', 'french beans'] },
  'french bean': { terms: ['french beans', 'fresh beans'] },
  cauliflower: { terms: ['fresh cauliflower', 'cauliflower'] },
  cabbage: { terms: ['fresh cabbage', 'cabbage'] },
  okra: { terms: ['fresh okra', 'bhindi', 'lady finger'] },
  bhindi: { terms: ['bhindi', 'fresh okra', 'lady finger'] },
  brinjal: { terms: ['brinjal', 'fresh brinjal'] },
  eggplant: { terms: ['brinjal', 'fresh brinjal'] },
  spinach: { terms: ['fresh spinach', 'palak', 'spinach'] },
  palak: { terms: ['palak', 'fresh spinach', 'spinach'] },
  methi: { terms: ['fresh methi', 'fenugreek leaves'] },
  'fenugreek leaf': { terms: ['methi', 'fenugreek leaves'] },
  coriander: { terms: ['fresh coriander', 'dhania', 'coriander leaves'] },
  cilantro: { terms: ['fresh coriander', 'dhania', 'coriander leaves'] },
  'coriander leaf': { terms: ['fresh coriander', 'dhania', 'coriander leaves'] },
  mint: { terms: ['fresh mint', 'pudina', 'mint leaves'] },
  'mint leaf': { terms: ['pudina', 'fresh mint', 'mint leaves'] },
  'curry leaf': { terms: ['curry leaves', 'fresh curry leaves'] },
  lemon: { terms: ['fresh lemon', 'lemon'] },
  lime: { terms: ['fresh lemon', 'lemon'] },
  pea: { terms: ['fresh green peas', 'green peas'] },
  'green pea': { terms: ['fresh green peas', 'green peas'] },
  cucumber: { terms: ['fresh cucumber', 'cucumber'] },
  beetroot: { terms: ['fresh beetroot', 'beetroot'] },
  pumpkin: { terms: ['fresh pumpkin', 'pumpkin'] },
  'bottle gourd': { terms: ['lauki', 'bottle gourd'] },
  lauki: { terms: ['lauki', 'bottle gourd'] },
  'sweet potato': { terms: ['sweet potato', 'fresh sweet potato'] },
  'spring onion': { terms: ['spring onion', 'scallion'] },
  shallot: { terms: ['shallot', 'small onion'] },

  // Fruits
  banana: { terms: ['fresh banana', 'banana'] },
  apple: { terms: ['fresh apple', 'apple'] },
  mango: { terms: ['fresh mango', 'mango'] },
  orange: { terms: ['fresh orange', 'orange'] },
  papaya: { terms: ['papaya', 'fresh papaya'] },
  pomegranate: { terms: ['pomegranate', 'fresh pomegranate'] },
  grape: { terms: ['fresh grapes', 'grapes'] },
  'coconut water': { terms: ['coconut water'] },

  // Dairy & protein
  milk: { terms: ['milk', 'fresh milk'] },
  paneer: { terms: ['fresh paneer', 'malai paneer', 'paneer'] },
  'cottage cheese': { terms: ['fresh paneer', 'paneer'] },
  curd: { terms: ['curd', 'dahi', 'fresh curd'] },
  yogurt: { terms: ['curd', 'dahi', 'yogurt'] },
  yoghurt: { terms: ['curd', 'dahi', 'yogurt'] },
  buttermilk: { terms: ['buttermilk', 'chaas'] },
  cream: { terms: ['fresh cream', 'cooking cream'] },
  'malai cream': { terms: ['fresh cream', 'malai'] },
  cheese: { terms: ['cheese', 'processed cheese'] },
  butter: { terms: ['butter', 'fresh butter'] },
  ghee: { terms: ['ghee', 'pure ghee'] },
  tofu: { terms: ['tofu', 'soya paneer'] },
  khoya: { terms: ['khoya', 'mawa'] },
  mawa: { terms: ['khoya', 'mawa'] },
  'coconut milk': { terms: ['coconut milk'] },
  chicken: { terms: ['fresh chicken', 'chicken'] },
  mutton: { terms: ['fresh mutton', 'mutton'] },
  lamb: { terms: ['fresh mutton', 'lamb'] },
  fish: { terms: ['fresh fish', 'fish'] },
  prawn: { terms: ['fresh prawns', 'prawns'] },
  shrimp: { terms: ['fresh prawns', 'shrimp'] },
  egg: { terms: ['fresh eggs', 'eggs'] },
  keema: { terms: ['fresh chicken mince', 'mince'] },

  // Grains & flours
  rice: { terms: ['rice', 'sona masoori rice'] },
  'basmati rice': { terms: ['basmati rice', 'basmati'] },
  'wheat flour': { terms: ['atta', 'whole wheat atta', 'chapati atta'] },
  atta: { terms: ['atta', 'whole wheat atta', 'chapati atta'] },
  maida: { terms: ['maida', 'refined flour'] },
  sooji: { terms: ['sooji', 'rava', 'semolina'] },
  semolina: { terms: ['sooji', 'rava', 'semolina'] },
  poha: { terms: ['poha', 'flattened rice'] },
  'flattened rice': { terms: ['poha', 'flattened rice'] },
  oats: { terms: ['oats', 'rolled oats'] },
  noodle: { terms: ['noodles', 'instant noodles'] },
  pasta: { terms: ['pasta', 'macaroni'] },
  macaroni: { terms: ['pasta', 'macaroni'] },
  vermicelli: { terms: ['vermicelli', 'sevai'] },
  bread: { terms: ['bread', 'sandwich bread'] },
  bun: { terms: ['bun', 'pav bun'] },
  pav: { terms: ['pav', 'pav bun'] },
  quinoa: { terms: ['quinoa'] },
  millet: { terms: ['millet', 'bajra'] },
  'sabudana': { terms: ['sabudana', 'sago'] },
  sago: { terms: ['sabudana', 'sago'] },
  corn: { terms: ['sweet corn', 'corn'] },

  // Pulses & legumes
  'toor dal': { terms: ['toor dal', 'arhar dal'] },
  'arhar dal': { terms: ['toor dal', 'arhar dal'] },
  'moong dal': { terms: ['moong dal', 'green gram dal'] },
  'masoor dal': { terms: ['masoor dal', 'red lentil'] },
  'chana dal': { terms: ['chana dal', 'split chickpea'] },
  'urad dal': { terms: ['urad dal', 'black gram dal'] },
  'moong': { terms: ['whole moong', 'green gram'] },
  rajma: { terms: ['rajma', 'kidney beans'] },
  'kidney bean': { terms: ['rajma', 'kidney beans'] },
  chickpea: { terms: ['kabuli chana', 'chana'] },
  chana: { terms: ['kabuli chana', 'chana'] },
  'kabuli chana': { terms: ['kabuli chana', 'chana'] },
  'kala chana': { terms: ['kala chana', 'black chana'] },
  besan: { terms: ['besan', 'gram flour'] },
  'gram flour': { terms: ['besan', 'gram flour'] },
  dal: { terms: ['dal', 'toor dal'] },

  // Spices & seasonings
  turmeric: { terms: ['turmeric powder', 'haldi'] },
  haldi: { terms: ['turmeric powder', 'haldi'] },
  'red chilli powder': { terms: ['red chilli powder', 'lal mirch powder'] },
  'kashmiri chilli powder': { terms: ['kashmiri red chilli powder'] },
  'coriander powder': { terms: ['coriander powder', 'dhania powder'] },
  'dhania powder': { terms: ['coriander powder', 'dhania powder'] },
  cumin: { terms: ['jeera', 'cumin seeds'] },
  'cumin seed': { terms: ['jeera', 'cumin seeds'] },
  jeera: { terms: ['jeera', 'cumin seeds'] },
  'mustard seed': { terms: ['rai', 'mustard seeds'] },
  mustard: { terms: ['rai', 'mustard seeds'] },
  rai: { terms: ['rai', 'mustard seeds'] },
  'garam masala': { terms: ['garam masala'] },
  'chhole masala': { terms: ['chhole masala'] },
  'paneer masala': { terms: ['paneer masala'] },
  cardamom: { terms: ['elaichi', 'cardamom'] },
  elaichi: { terms: ['elaichi', 'cardamom'] },
  cinnamon: { terms: ['dalchini', 'cinnamon'] },
  dalchini: { terms: ['dalchini', 'cinnamon'] },
  clove: { terms: ['lavang', 'cloves'] },
  'bay leaf': { terms: ['bay leaf', 'tej patta'] },
  'black pepper': { terms: ['black pepper', 'kali mirch'] },
  pepper: { terms: ['black pepper', 'kali mirch'] },
  'fenugreek seed': { terms: ['methi seeds', 'fenugreek seeds'] },
  'kasuri methi': { terms: ['kasuri methi', 'dried fenugreek leaves'] },
  amchur: { terms: ['amchur', 'dry mango powder'] },
  'dry mango powder': { terms: ['amchur', 'dry mango powder'] },
  'chaat masala': { terms: ['chaat masala'] },
  asafoetida: { terms: ['hing', 'asafoetida'] },
  hing: { terms: ['hing', 'asafoetida'] },
  fennel: { terms: ['saunf', 'fennel seeds'] },
  saunf: { terms: ['saunf', 'fennel seeds'] },
  ajwain: { terms: ['ajwain', 'carom seeds'] },
  'carom seed': { terms: ['ajwain', 'carom seeds'] },
  tamarind: { terms: ['imli', 'tamarind'] },
  imli: { terms: ['imli', 'tamarind'] },
  'star anise': { terms: ['star anise'] },
  saffron: { terms: ['kesar', 'saffron'] },
  kesar: { terms: ['kesar', 'saffron'] },
  sesame: { terms: ['til', 'sesame seeds'] },
  til: { terms: ['til', 'sesame seeds'] },
  salt: { terms: ['salt', 'iodised salt'] },
  'black salt': { terms: ['black salt', 'kala namak'] },
  sugar: { terms: ['sugar'] },
  jaggery: { terms: ['jaggery', 'gud'] },
  honey: { terms: ['honey'] },

  // Oils & specialty
  oil: { terms: ['cooking oil', 'sunflower oil', 'refined oil'] },
  'refined oil': { terms: ['cooking oil', 'sunflower oil', 'refined oil'] },
  'cooking oil': { terms: ['cooking oil', 'sunflower oil', 'refined oil'] },
  'mustard oil': { terms: ['mustard oil', 'kachi ghani'] },
  'coconut oil': { terms: ['coconut oil'] },
  'groundnut oil': { terms: ['groundnut oil', 'peanut oil'] },
  'peanut oil': { terms: ['groundnut oil', 'peanut oil'] },
  'olive oil': { terms: ['olive oil'] },
  'sunflower oil': { terms: ['sunflower oil'] },
  vinegar: { terms: ['vinegar', 'white vinegar'] },
  'soy sauce': { terms: ['soy sauce'] },
  cornflour: { terms: ['cornflour', 'corn starch'] },
  'corn starch': { terms: ['cornflour', 'corn starch'] },
  'baking powder': { terms: ['baking powder'] },
  'baking soda': { terms: ['baking soda', 'cooking soda'] },
  yeast: { terms: ['dry yeast', 'baking yeast'] },
  cashew: { terms: ['cashew nuts', 'kaju'] },
  almond: { terms: ['almonds', 'badam'] },
  badam: { terms: ['almonds', 'badam'] },
  peanut: { terms: ['peanuts', 'groundnut'] },
  groundnut: { terms: ['peanuts', 'groundnut'] },
  raisin: { terms: ['raisins', 'kishmish'] },
  coconut: { terms: ['coconut', 'fresh coconut'] },
  'desiccated coconut': { terms: ['desiccated coconut'] },
  tea: { terms: ['tea', 'tea leaves'] },
  coffee: { terms: ['coffee', 'instant coffee'] },
  cocoa: { terms: ['cocoa powder'] },
  chocolate: { terms: ['chocolate', 'dark chocolate'] },
}

/** Ingredients that are not vegetarian (whole-word canonical keys). */
const NON_VEGETARIAN = new Set([
  'chicken', 'mutton', 'lamb', 'beef', 'pork', 'fish', 'prawn', 'shrimp',
  'crab', 'salmon', 'tuna', 'keema', 'bacon', 'sausage', 'egg',
])

const _familyCache = new Map()

/** All canonical keys that resolve to the same KB entry (an alias family). */
export function aliasFamily(canonical) {
  const key = String(canonical || '').toLowerCase().trim()
  if (!key) return [key || 'unknown']
  const entry = SUPERMARKET_ALIASES[key]
  if (!entry) return [key]
  if (_familyCache.size === 0) {
    // Family = shared PRIMARY search term: "wheat flour" and "atta" both
    // lead with "atta", so they are the same grocery item.
    for (const [k, v] of Object.entries(SUPERMARKET_ALIASES)) {
      const primary = v.terms?.[0] || k
      const list = _familyCache.get(primary) || []
      list.push(k)
      _familyCache.set(primary, list)
    }
  }
  return _familyCache.get(entry.terms?.[0] || key) || [key]
}

/** KB entry for a canonical ingredient (shared primary term = same family). */
export function resolveAliasEntry(canonical) {
  return SUPERMARKET_ALIASES[String(canonical || '').toLowerCase().trim()] || null
}

/** Supermarket-searchable terms for an ingredient, best first. */
export function supermarketTermsFor(canonical, displayName) {
  const entry = resolveAliasEntry(canonical)
  const terms = entry ? [...entry.terms] : []
  const display = String(displayName || '').trim().toLowerCase()
  if (display && !terms.includes(display)) terms.push(display)
  return terms.slice(0, 4)
}

/** 'veg' | 'non-veg' tag for an ingredient (eggs count as non-veg). */
export function ingredientDietaryTag(canonical) {
  return NON_VEGETARIAN.has(String(canonical || '').toLowerCase().trim()) ? 'non-veg' : 'veg'
}

/* ─────────────────────────── confidence scoring ──────────────────────── */

const PRICE_STALE_DAYS = 7

export function isStaleTimestamp(isoString) {
  if (!isoString) return true
  const age = Date.now() - new Date(isoString).getTime()
  return !Number.isFinite(age) || age > PRICE_STALE_DAYS * 86400000
}

/**
 * Confidence that a catalog product IS the ingredient (0-1).
 * Identity 0.95 → family alias 0.85 → fallback 0.5; stale price −0.05;
 * preferred brand +0.05. AI-estimate sources are capped at 0.45 by the
 * caller (they are suggestions, never auto-selected facts).
 */
export function scoreCandidate(product, ingredient, preferredBrands = []) {
  const ingKey = String(ingredient?.canonical || '').toLowerCase().trim()
  const prodKey = String(product?.canonical || '').toLowerCase().trim()
  if (!ingKey || !prodKey) return 0
  let score
  if (prodKey === ingKey) score = 0.95
  else if (aliasFamily(ingKey).includes(prodKey)) score = 0.85
  else score = 0.5
  if (isStaleTimestamp(product?.verifiedAt)) score -= 0.05
  const brands = (preferredBrands || []).map((b) => String(b).toLowerCase().trim())
  if (product?.brand && brands.includes(String(product.brand).toLowerCase().trim())) {
    score = Math.min(0.99, score + 0.05)
  }
  if (product?.priceSource === 'ai-estimate') score = Math.min(score, 0.45)
  return Math.round(Math.max(0, Math.min(1, score)) * 100) / 100
}

/**
 * Match one grocery item against user-verified catalog products.
 * Only same-alias-family, dimension-compatible packages are candidates.
 */
export function matchIngredient(item, { catalogEntries = [], preferredBrands = [] } = {}) {
  const family = aliasFamily(item?.canonical)
  const candidates = (Array.isArray(catalogEntries) ? catalogEntries : [])
    .filter((p) => p && family.includes(String(p.canonical || '').toLowerCase().trim()))
    .filter((p) => {
      // Package unit family must match the ingredient's dimension (g-pack
      // for mass ingredients, piece-pack for count ingredients).
      if (!item?.dim || !p.packageDim) return true
      return p.packageDim === item.dim
    })
    .map((p) => ({
      catalogId: p.id,
      retailerId: p.retailerId,
      name: p.name,
      brand: p.brand || '',
      canonical: p.canonical,
      packageAmount: p.packageAmount,
      packageUnit: p.packageUnit,
      packageBase: p.packageBase,
      packageDim: p.packageDim,
      price: p.price,
      mrp: p.mrp ?? null,
      priceSource: 'user-verified',
      availability: p.availability,
      pincodeEntered: p.pincode || null,
      verifiedAt: p.verifiedAt,
      url: p.url || null,
      searchTerm: p.searchTerm || p.canonical,
      priceStale: isStaleTimestamp(p.verifiedAt),
      confidence: scoreCandidate(p, item, preferredBrands),
    }))
    .sort((a, b) => b.confidence - a.confidence || unitPrice(a) - unitPrice(b))

  const dietary = ingredientDietaryTag(item?.canonical)
  return {
    family,
    terms: supermarketTermsFor(item?.canonical, item?.name),
    dietary,
    candidates,
    // Ambiguity: several plausible candidates → user must choose.
    needsApproval: candidates.length !== 1 || candidates[0]?.confidence < 0.85,
  }
}

/** Auto-attach ONLY a single, fresh, high-confidence user-verified product. */
export function pickDefaultCandidate(matched) {
  const candidates = matched?.candidates || []
  if (candidates.length === 1 && candidates[0].confidence >= 0.85 && !candidates[0].priceStale) {
    return { ...candidates[0], autoSelected: true }
  }
  return null
}

function unitPrice(p) {
  if (!p?.packageBase || p?.price == null) return Number.POSITIVE_INFINITY
  return p.price / p.packageBase
}

/* ─────────────────────────── package optimizer ───────────────────────── */

/**
 * Minimum-cost combination of package sizes that covers `requiredBase`.
 *
 * Deterministic dynamic program: an optimal solution never needs more than
 * required + largest single package (anything beyond that has a droppable
 * pack), so the state space stays tiny. Never modifies the requirement —
 * the rounding difference is reported as `deltaBase`.
 *
 * @param {number} requiredBase amount needed, in base units (g / ml / pieces)
 * @param {Array<{packageBase: number, price: number}>} packages priced options
 * @returns {{packages: Array, totalBase, totalCost, deltaBase, requiredBase}|null}
 */
export function optimizePackages(requiredBase, packages) {
  const req = Number(requiredBase)
  if (!Number.isFinite(req) || req <= 0) return null
  const usable = (Array.isArray(packages) ? packages : [])
    .map((p) => ({
      ...p,
      base: Math.max(1, Math.round(Number(p.packageBase))),
      price: Number(p.price),
    }))
    .filter((p) => Number.isFinite(p.price) && p.price >= 0 && p.base > 0)
    .filter((p, i, arr) => arr.findIndex((q) => q.base === p.base) === i)
  if (!usable.length) return null

  const maxBase = Math.max(...usable.map((p) => p.base))
  const reqI = Math.max(1, Math.round(req))
  const cap = reqI + maxBase

  const dp = new Float64Array(cap + 1).fill(Number.POSITIVE_INFINITY)
  const choice = new Int16Array(cap + 1).fill(-1)
  dp[0] = 0
  for (let i = 1; i <= cap; i++) {
    for (let p = 0; p < usable.length; p++) {
      const prev = Math.max(0, i - usable[p].base)
      if (dp[prev] === Number.POSITIVE_INFINITY) continue
      const cost = dp[prev] + usable[p].price
      if (cost < dp[i] - 1e-9) {
        dp[i] = cost
        choice[i] = p
      }
    }
  }
  if (dp[reqI] === Number.POSITIVE_INFINITY) return null

  const counts = new Map()
  let i = reqI
  while (i > 0 && choice[i] !== -1) {
    const p = choice[i]
    counts.set(p, (counts.get(p) || 0) + 1)
    i = Math.max(0, i - usable[p].base)
  }

  const chosen = [...counts.entries()].map(([p, count]) => ({
    catalogId: usable[p].catalogId,
    name: usable[p].name,
    brand: usable[p].brand || '',
    packageBase: usable[p].base,
    packageUnit: usable[p].packageUnit,
    price: usable[p].price,
    count,
  }))
  const totalBase = chosen.reduce((sum, c) => sum + c.packageBase * c.count, 0)
  const totalCost = chosen.reduce((sum, c) => sum + c.price * c.count, 0)
  return {
    packages: chosen,
    totalBase,
    totalCost: Math.round(totalCost * 100) / 100,
    deltaBase: Math.round((totalBase - reqI) * 100) / 100,
    requiredBase: reqI,
  }
}

/* ─────────────────────────── cart estimation ─────────────────────────── */

/**
 * Shopping-cost intelligence over the grocery list (deterministic).
 *
 * Three clearly-separated price sources:
 *   • user-verified product prices / manual per-unit prices → verifiedTotal
 *   • AI-estimate product prices → estimatedTotal (labeled, never "actual")
 *   • everything else → unpricedCount
 *
 * Also computes per-line package math (packages needed, rounding delta) and
 * honesty flags (stale prices, prices entered for a different PIN).
 *
 * @param {Array} items grocery list items (with optional `product` snapshot)
 * @param {{budget?: number, pincode?: string}} [context]
 */
export function estimateShoppingCart(items, { budget, pincode } = {}) {
  const lines = []
  let verifiedTotal = 0
  let estimatedTotal = 0
  let mrpTotal = 0
  let savings = 0
  let matchedCount = 0
  let unpricedCount = 0
  let stalePriceCount = 0
  let pinStaleCount = 0
  const expensive = []

  for (const item of Array.isArray(items) ? items : []) {
    if (!item) continue
    const product = item.product || null
    let line = {
      id: item.id,
      name: item.name,
      packagesNeeded: null,
      purchasedBase: null,
      deltaBase: null,
      deltaText: null,
      lineCost: null,
      priceSource: null,
      priceStale: false,
      pinStale: false,
      unitMismatch: false,
    }

    if (product && product.packageBase > 0 && item.toBuyBase != null && product.packageDim === item.dim) {
      const packagesNeeded = Math.max(1, Math.ceil(item.toBuyBase / product.packageBase))
      const purchasedBase = Math.round(packagesNeeded * product.packageBase * 100) / 100
      const deltaBase = Math.round((purchasedBase - item.toBuyBase) * 100) / 100
      line.packagesNeeded = packagesNeeded
      line.purchasedBase = purchasedBase
      line.deltaBase = deltaBase
      line.deltaText =
        deltaBase > 0 ? `+${formatBase(deltaBase, item.dim)} vs recipe` : 'matches recipe quantity'
      line.priceSource = product.priceSource || null
      line.priceStale = product.priceSource === 'user-verified' && isStaleTimestamp(product.verifiedAt)
      line.pinStale = Boolean(
        product.pincodeEntered && pincode && String(product.pincodeEntered) !== String(pincode)
      )
      line.pinNote = line.pinStale ? `price entered for PIN ${product.pincodeEntered}` : null

      if (Number.isFinite(Number(product.price))) {
        line.lineCost = Math.round(packagesNeeded * Number(product.price) * 100) / 100
        if (product.priceSource === 'ai-estimate') estimatedTotal += line.lineCost
        else verifiedTotal += line.lineCost
        expensive.push({ name: `${product.brand ? product.brand + ' ' : ''}${product.name}`, cost: line.lineCost })
        matchedCount += 1
      } else {
        unpricedCount += 1
      }
      if (Number.isFinite(Number(product.mrp)) && product.mrp > 0) {
        const mrpLine = Math.round(packagesNeeded * Number(product.mrp) * 100) / 100
        mrpTotal += mrpLine
        if (line.lineCost != null) savings += mrpLine - line.lineCost
      }
      if (line.priceStale) stalePriceCount += 1
      if (line.pinStale) pinStaleCount += 1
    } else if (product) {
      // Product attached but its package unit family does not match the
      // ingredient's units (e.g. pieces vs grams) — flag, never guess.
      line.unitMismatch = true
      line.priceSource = product.priceSource || null
      unpricedCount += 1
    } else if (Number.isFinite(Number(item.price)) && Number(item.price) > 0 && Number(item.toBuyAmount) > 0) {
      // Manual per-unit price (user-entered) — user-verified by definition.
      line.lineCost = Math.round(Number(item.price) * Number(item.toBuyAmount) * 100) / 100
      line.priceSource = 'user-verified (per unit)'
      verifiedTotal += line.lineCost
      expensive.push({ name: item.name, cost: line.lineCost })
      matchedCount += 1
    } else {
      unpricedCount += 1
    }

    lines.push(line)
  }

  expensive.sort((a, b) => b.cost - a.cost)
  const plannedTotal = Math.round((verifiedTotal + estimatedTotal) * 100) / 100
  const budgetNum = Number(budget)
  return {
    lines,
    currency: 'INR',
    verifiedTotal: Math.round(verifiedTotal * 100) / 100,
    estimatedTotal: Math.round(estimatedTotal * 100) / 100,
    plannedTotal,
    mrpTotal: Math.round(mrpTotal * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    budget: Number.isFinite(budgetNum) && budgetNum > 0 ? budgetNum : null,
    budgetRemaining:
      Number.isFinite(budgetNum) && budgetNum > 0
        ? Math.round((budgetNum - plannedTotal) * 100) / 100
        : null,
    matchedCount,
    unpricedCount,
    stalePriceCount,
    pinStaleCount,
    topExpensive: expensive.slice(0, 3),
  }
}
